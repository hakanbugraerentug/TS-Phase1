using System.Text;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Persistency.Services;

public class PlaceholderImageService : IPlaceholderImageService
{
    private static readonly string[] Colors =
    [
        "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"
    ];

    public Task<string> GenerateAsync(string projectId)
    {
        var colorIndex = Math.Abs(projectId.GetHashCode()) % Colors.Length;
        var color = Colors[colorIndex];
        var shortId = "P" + (projectId.Length >= 4 ? projectId[..4] : projectId);

        var svg = $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
              <rect width="1024" height="1024" fill="{color}"/>
              <text x="512" y="560" font-family="sans-serif" font-size="180" font-weight="bold" fill="white" text-anchor="middle">{shortId}</text>
            </svg>
            """;

        var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));
        return Task.FromResult($"data:image/svg+xml;base64,{b64}");
    }
}
