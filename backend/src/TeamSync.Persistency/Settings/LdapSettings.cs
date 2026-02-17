namespace TeamSync.Persistency.Settings;

public class LdapSettings
{
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; }
    public string BaseDn { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
}
