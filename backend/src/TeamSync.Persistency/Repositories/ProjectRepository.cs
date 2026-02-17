using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly IMongoCollection<Project> _collection;

    public ProjectRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<Project>("projects");
    }

    public async Task<List<Project>> GetAllAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task<Project?> GetByIdAsync(string id)
    {
        var filter = Builders<Project>.Filter.Eq(p => p.Id, id);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<Project>> GetByOwnerAsync(string owner)
    {
        var filter = Builders<Project>.Filter.Eq(p => p.Owner, owner);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<Project> CreateAsync(Project project)
    {
        await _collection.InsertOneAsync(project);
        return project;
    }

    public async Task<Project> UpdateAsync(Project project)
    {
        var filter = Builders<Project>.Filter.Eq(p => p.Id, project.Id);
        var result = await _collection.ReplaceOneAsync(filter, project);
        
        if (result.ModifiedCount == 0)
        {
            throw new InvalidOperationException($"Project with ID {project.Id} not found or not modified.");
        }
        
        return project;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<Project>.Filter.Eq(p => p.Id, id);
        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }
}
