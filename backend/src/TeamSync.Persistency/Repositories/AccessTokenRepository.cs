using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;
using TeamSync.Persistency.Settings;

namespace TeamSync.Persistency.Repositories;

public class AccessTokenRepository : IAccessTokenRepository
{
    private readonly IMongoCollection<AccessToken> _collection;
    private readonly byte[] _aesKey;

    public AccessTokenRepository(MongoDbContext context, IOptions<EncryptionSettings> encryptionSettings)
    {
        _collection = context.Database.GetCollection<AccessToken>(AccessToken.CollectionName);

        var keyBase64 = encryptionSettings.Value.AesKey;
        if (string.IsNullOrWhiteSpace(keyBase64))
            throw new InvalidOperationException("EncryptionSettings:AesKey is not configured.");

        _aesKey = Convert.FromBase64String(keyBase64);
        if (_aesKey.Length != 32)
            throw new InvalidOperationException("EncryptionSettings:AesKey must be a 32-byte (256-bit) Base64-encoded value.");
    }

    public async Task<AccessToken?> GetByUsernameAsync(string username)
    {
        var filter = Builders<AccessToken>.Filter.Eq(a => a.Username, username);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<bool> ExistsAsync(string username)
    {
        var filter = Builders<AccessToken>.Filter.Eq(a => a.Username, username);
        return await _collection.Find(filter).AnyAsync();
    }

    public async Task UpsertAsync(string username, string baseUrl, string plainPat)
    {
        var encryptedPat = EncryptPat(plainPat);

        var filter = Builders<AccessToken>.Filter.Eq(a => a.Username, username);
        var update = Builders<AccessToken>.Update
            .Set(a => a.BaseUrl, baseUrl)
            .Set(a => a.EncryptedPat, encryptedPat)
            .Set(a => a.UpdatedAt, DateTime.UtcNow)
            .SetOnInsert(a => a.Username, username)
            .SetOnInsert(a => a.CreatedAt, DateTime.UtcNow);

        await _collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
    }

    public async Task<(string BaseUrl, string PlainPat)?> GetDecryptedCredentialsAsync(string username)
    {
        var record = await GetByUsernameAsync(username);
        if (record == null)
            return null;

        var plainPat = DecryptPat(record.EncryptedPat);
        return (record.BaseUrl, plainPat);
    }

    // -------------------------------------------------------------------------
    // Private encryption helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Encrypts a plain-text PAT using AES-256-CBC.
    /// The 16-byte IV is prepended to the cipher text and the whole is Base64-encoded.
    /// </summary>
    private string EncryptPat(string plainPat)
    {
        using var aes = Aes.Create();
        aes.Key = _aesKey;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var plainBytes = Encoding.UTF8.GetBytes(plainPat);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // Prepend the 16-byte IV so we can decrypt later
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);

        return Convert.ToBase64String(result);
    }

    /// <summary>
    /// Decrypts a Base64 cipher text that was produced by <see cref="EncryptPat"/>.
    /// </summary>
    private string DecryptPat(string encryptedPat)
    {
        var data = Convert.FromBase64String(encryptedPat);

        using var aes = Aes.Create();
        aes.Key = _aesKey;

        var iv = new byte[16];
        Buffer.BlockCopy(data, 0, iv, 0, iv.Length);
        aes.IV = iv;

        var cipherBytes = new byte[data.Length - iv.Length];
        Buffer.BlockCopy(data, iv.Length, cipherBytes, 0, cipherBytes.Length);

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }
}

