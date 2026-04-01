using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

[BsonIgnoreExtraElements]
public class WeeklyReport
{
    public const string CollectionName = "weekly_reports";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("weekStart")]
    public string WeekStart { get; set; } = string.Empty;

    [BsonElement("reportData")]
    public BsonDocument? ReportData { get; set; }

    [BsonElement("savedAt")]
    public DateTime SavedAt { get; set; }

    [BsonElement("author")]
    public string Author { get; set; } = string.Empty;

    [BsonElement("date")]
    public DateTime Date { get; set; }

    [BsonElement("reviewer")]
    public string Reviewer { get; set; } = string.Empty;

    [BsonElement("readyToReview")]
    public bool ReadyToReview { get; set; } = false;

    [BsonElement("status")]
    public string Status { get; set; } = string.Empty;
}
