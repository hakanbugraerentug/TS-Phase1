using System.Text.Json.Serialization;

namespace TeamSync.Application.DTOs;

public class LoginResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("user")]
    public UserInfo User { get; set; } = new();
}

public class UserInfo
{
    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("employee_id")]
    public string EmployeeId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string Department { get; set; } = string.Empty;

    [JsonPropertyName("mail")]
    public string Mail { get; set; } = string.Empty;
}
