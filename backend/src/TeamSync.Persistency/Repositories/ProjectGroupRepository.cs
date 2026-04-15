using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class ProjectGroupRepository : IProjectGroupRepository
{
    private readonly IMongoCollection<ProjectGroup> _collection;

    public ProjectGroupRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<ProjectGroup>(ProjectGroup.CollectionName);
    }

    public async Task<List<ProjectGroup>> GetAllAsync()
        => await _collection.Find(_ => true).ToListAsync();

    public async Task<List<ProjectGroup>> GetByCreatedByAsync(string username)
    {
        var filter = Builders<ProjectGroup>.Filter.Eq(g => g.CreatedBy, username);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<ProjectGroup?> GetByIdAsync(string id)
    {
        var filter = Builders<ProjectGroup>.Filter.Eq(g => g.Id, id);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<ProjectGroup> CreateAsync(ProjectGroup group)
    {
        await _collection.InsertOneAsync(group);
        return group;
    }

    public async Task<ProjectGroup?> UpdateAsync(string id, ProjectGroup group)
    {
        var filter = Builders<ProjectGroup>.Filter.Eq(g => g.Id, id);
        var result = await _collection.ReplaceOneAsync(filter, group);
        return result.MatchedCount > 0 ? group : null;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<ProjectGroup>.Filter.Eq(g => g.Id, id);
        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }
}