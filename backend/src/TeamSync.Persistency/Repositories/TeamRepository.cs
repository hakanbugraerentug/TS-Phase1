using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly IMongoCollection<Team> _collection;

    public TeamRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<Team>(Team.CollectionName);
    }

    public async Task<Team> CreateAsync(Team team)
    {
        await _collection.InsertOneAsync(team);
        return team;
    }

    public async Task<Team?> GetByIdAsync(string id)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.Id, id);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<Team>> GetAllAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task<List<Team>> GetByProjectIdAsync(string projectId)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.ProjectId, projectId);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<Team>> GetByMemberAsync(string username)
    {
        var filter = Builders<Team>.Filter.AnyEq(t => t.Members, username);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<Team?> UpdateAsync(string id, Team team)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.Id, id);
        var result = await _collection.ReplaceOneAsync(filter, team);
        return result.MatchedCount > 0 ? team : null;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.Id, id);
        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public async Task<Team?> SetLeaderAsync(string id, string leaderUsername)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.Id, id);
        var update = Builders<Team>.Update.Set(t => t.Leader, leaderUsername);
        var options = new FindOneAndUpdateOptions<Team> { ReturnDocument = ReturnDocument.After };
        return await _collection.FindOneAndUpdateAsync(filter, update, options);
    }

    public async Task<Team?> AddMemberAsync(string id, string username)
    {
        var filter = Builders<Team>.Filter.And(
            Builders<Team>.Filter.Eq(t => t.Id, id),
            Builders<Team>.Filter.Not(Builders<Team>.Filter.AnyEq(t => t.Members, username))
        );
        var update = Builders<Team>.Update.Push(t => t.Members, username);
        var options = new FindOneAndUpdateOptions<Team> { ReturnDocument = ReturnDocument.After };
        var result = await _collection.FindOneAndUpdateAsync(filter, update, options);
        if (result != null) return result;
        // Member already exists - return current document
        return await GetByIdAsync(id);
    }

    public async Task<Team?> RemoveMemberAsync(string id, string username)
    {
        var filter = Builders<Team>.Filter.Eq(t => t.Id, id);
        var update = Builders<Team>.Update.Pull(t => t.Members, username);
        var options = new FindOneAndUpdateOptions<Team> { ReturnDocument = ReturnDocument.After };
        return await _collection.FindOneAndUpdateAsync(filter, update, options);
    }
}
