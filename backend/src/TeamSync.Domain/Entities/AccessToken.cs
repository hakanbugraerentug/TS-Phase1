using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

public class AccessToken
{
    public const string CollectionName = "access_tokens";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("baseUrl")]
    public string BaseUrl { get; set; } = string.Empty;

    [BsonElement("encryptedPat")]
    public string EncryptedPat { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
