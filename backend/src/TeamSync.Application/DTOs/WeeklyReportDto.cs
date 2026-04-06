using System.Text.Json;
using System.Text.Json.Serialization;

namespace TeamSync.Application.DTOs;

public class SaveWeeklyReportRequest
{
    [JsonPropertyName("weekStart")]
    public string WeekStart { get; set; } = string.Empty;

    [JsonPropertyName("reportData")]
    public JsonElement ReportData { get; set; }

    [JsonPropertyName("author")]
    public string Author { get; set; } = string.Empty;

    [JsonPropertyName("reviewer")]
    public string Reviewer { get; set; } = string.Empty;

    [JsonPropertyName("reviewers")]
    public List<string> Reviewers { get; set; } = new();

    [JsonPropertyName("readyToReview")]
    public bool ReadyToReview { get; set; } = false;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class WeeklyReportDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("weekStart")]
    public string WeekStart { get; set; } = string.Empty;

    [JsonPropertyName("reportData")]
    public object? ReportData { get; set; }

    [JsonPropertyName("savedAt")]
    public DateTime SavedAt { get; set; }

    [JsonPropertyName("author")]
    public string Author { get; set; } = string.Empty;

    [JsonPropertyName("reviewer")]
    public string Reviewer { get; set; } = string.Empty;

    [JsonPropertyName("reviewers")]
    public List<string> Reviewers { get; set; } = new();

    [JsonPropertyName("readyToReview")]
    public bool ReadyToReview { get; set; } = false;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class SubmitWeeklyReportRequest
{
    [JsonPropertyName("weekStart")]
    public string WeekStart { get; set; } = string.Empty;
}
