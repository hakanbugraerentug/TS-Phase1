using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IAccessTokenRepository
{
    Task<AccessToken?> GetByUsernameAsync(string username);
    Task<bool> ExistsAsync(string username);

    /// <summary>Encrypts the PAT and upserts the credentials for the given user.</summary>
    Task UpsertAsync(string username, string baseUrl, string plainPat);

    /// <summary>Returns the decrypted BASE_URL and PAT, or null if not configured.</summary>
    Task<(string BaseUrl, string PlainPat)?> GetDecryptedCredentialsAsync(string username);
}
