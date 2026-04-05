namespace TeamSync.Persistency.Settings;

public class EncryptionSettings
{
    /// <summary>
    /// 32-byte (256-bit) Base64-encoded key used for AES-256 encryption of PAT values.
    /// Generate with: Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
    /// </summary>
    public string AesKey { get; set; } = string.Empty;
}
