using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

public class User
{
    public const string CollectionName = "users";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("name")]
    public string FullName { get; set; } = string.Empty;

    [BsonElement("employeeId")]
    public string EmployeeId { get; set; } = string.Empty;

    [BsonElement("photo")]
    public byte[]? Photo { get; set; }
}
