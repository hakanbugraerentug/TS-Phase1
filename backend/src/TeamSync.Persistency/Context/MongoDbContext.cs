using MongoDB.Driver;
using Microsoft.Extensions.Options;
using TeamSync.Persistency.Settings;
using TeamSync.Domain.Entities;

namespace TeamSync.Persistency.Context;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);
    }

    public IMongoDatabase Database => _database;
    public IMongoCollection<Project> Projects => _database.GetCollection<Project>("projects");
}
