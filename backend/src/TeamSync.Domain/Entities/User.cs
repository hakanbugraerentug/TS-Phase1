using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

[BsonIgnoreExtraElements]
public class User
{
    public const string CollectionName = "users";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("distinguishedName")]
    public string DistinguishedName { get; set; } = string.Empty;

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("name")]
    public string FullName { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("sector")]
    public string Sector { get; set; } = string.Empty;

    [BsonElement("directorate")]
    public string Directorate { get; set; } = string.Empty;

    [BsonElement("department")]
    public string Department { get; set; } = string.Empty;

    [BsonElement("mail")]
    public string Mail { get; set; } = string.Empty;

    [BsonElement("telephone")]
    public string Telephone { get; set; } = string.Empty;

    [BsonElement("manager")]
    public string Manager { get; set; } = string.Empty;

    [BsonElement("photo")]
    public byte[]? Photo { get; set; }
}
