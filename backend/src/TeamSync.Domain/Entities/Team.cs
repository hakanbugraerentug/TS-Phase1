using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

public class Team
{
    public const string CollectionName = "teams";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("leader")]
    public string Leader { get; set; } = string.Empty;

    [BsonElement("members")]
    public List<string> Members { get; set; } = new();

    [BsonElement("projectId")]
    public string ProjectId { get; set; } = string.Empty;
}
