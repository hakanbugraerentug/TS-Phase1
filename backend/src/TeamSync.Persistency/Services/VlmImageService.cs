using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Settings;

namespace TeamSync.Persistency.Services;

public class VlmImageService : IVlmImageService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly VlmSettings _settings;

    public VlmImageService(IHttpClientFactory httpClientFactory, IOptions<VlmSettings> options)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
    }

    public async Task<string> GenerateProjectImageAsync(string title, string description)
    {
        // Sanitize inputs to remove control characters before embedding in prompt
        var safeTitle = System.Text.RegularExpressions.Regex.Replace(title, @"[\x00-\x1F\x7F]", " ").Trim();
        var safeDescription = System.Text.RegularExpressions.Regex.Replace(description, @"[\x00-\x1F\x7F]", " ").Trim();

        var prompt = $"Minimal, modern ve kurumsal bir banner görseli. Konu: {safeTitle}. {safeDescription}. Soyut, ikonik ve flat tasarım. Görsel içinde metin veya yazı olmasın. Marka logosu veya hassas içerik yok.";

        var payload = new
        {
            model = _settings.Model,
            prompt,
            size = _settings.ImageSize,
            n = 1,
            response_format = "b64_json"
        };

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
        var client = _httpClientFactory.CreateClient("VlmClient");
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ApiKey}");
        client.DefaultRequestHeaders.Add("Accept", "application/json");

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{_settings.BaseUrl.TrimEnd('/')}/v1/images/generations", content, cts.Token);
        response.EnsureSuccessStatusCode();

        var responseBody = await response.Content.ReadAsStringAsync(cts.Token);
        using var doc = JsonDocument.Parse(responseBody);

        var b64 = doc.RootElement
            .GetProperty("data")[0]
            .GetProperty("b64_json")
            .GetString();

        if (string.IsNullOrEmpty(b64))
            throw new InvalidOperationException("VLM API boş b64_json döndürdü.");

        return $"data:image/png;base64,{b64}";
    }
}
