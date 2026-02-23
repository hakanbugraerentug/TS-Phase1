namespace TeamSync.Persistency.Settings;

public class VlmSettings
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string ImageSize { get; set; } = "1024x1024";
    public int TimeoutSeconds { get; set; } = 8;
}
