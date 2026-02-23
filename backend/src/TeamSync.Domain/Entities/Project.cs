using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TeamSync.Domain.Entities;

public class Sorumlu
{
    [BsonElement("etiket")]
    public string Etiket { get; set; } = string.Empty;

    [BsonElement("isim")]
    public string Isim { get; set; } = string.Empty;
}

[BsonIgnoreExtraElements]
public class Project
{
    public const string CollectionName = "projects";

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("owner")]
    public string Owner { get; set; } = string.Empty;

    [BsonElement("members")]
    public List<string> Members { get; set; } = new();

    [BsonElement("sorumlular")]
    public List<Sorumlu> Sorumlular { get; set; } = new();

    [BsonElement("ilgili_ekip_idleri")]
    public List<string> IlgiliEkipIdleri { get; set; } = new();

    [BsonElement("card_image")]
    public string? CardImage { get; set; }
}
