namespace TeamSync.Persistency.Settings;

public class LlmSettings
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string CaCertPath { get; set; } = string.Empty;
}
