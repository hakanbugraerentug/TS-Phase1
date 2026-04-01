using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

public class Delegation
{
    public const string CollectionName = "delegations";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("delegatorUsername")]
    public string DelegatorUsername { get; set; } = string.Empty;

    [BsonElement("delegateUsername")]
    public string DelegateUsername { get; set; } = string.Empty;

    [BsonElement("durationType")]
    public string DurationType { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}
