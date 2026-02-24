using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TeamSync.Persistency.Settings;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/llm")]
[Authorize]
public class LlmController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly LlmSettings _settings;

    public LlmController(IHttpClientFactory httpClientFactory, IOptions<LlmSettings> options)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] JsonElement requestBody)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
            return StatusCode(503, new { message = "LLM endpoint is not configured." });

        var client = _httpClientFactory.CreateClient("LlmClient");

        // Build the request body, using backend-configured model
        var requestDict = new Dictionary<string, JsonElement>();
        foreach (var property in requestBody.EnumerateObject())
        {
            if (property.Name == "model") continue; // use backend config
            requestDict[property.Name] = property.Value;
        }

        // Serialize with the backend-configured model; JsonElement values serialize correctly
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream);
        writer.WriteStartObject();
        writer.WriteString("model", _settings.Model);
        foreach (var kvp in requestDict)
        {
            writer.WritePropertyName(kvp.Key);
            kvp.Value.WriteTo(writer);
        }
        writer.WriteEndObject();
        writer.Flush();

        var content = new StringContent(Encoding.UTF8.GetString(stream.ToArray()), Encoding.UTF8, "application/json");

        if (!string.IsNullOrEmpty(_settings.ApiKey))
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Bearer {_settings.ApiKey}");

        var response = await client.PostAsync(
            $"{_settings.BaseUrl.TrimEnd('/')}/v1/chat/completions",
            content);

        var responseBody = await response.Content.ReadAsStringAsync();

        return response.IsSuccessStatusCode
            ? Content(responseBody, "application/json")
            : StatusCode((int)response.StatusCode, responseBody);
    }
}
