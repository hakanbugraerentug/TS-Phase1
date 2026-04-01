using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class DelegationRepository : IDelegationRepository
{
    private readonly IMongoCollection<Delegation> _collection;

    public DelegationRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<Delegation>(Delegation.CollectionName);
    }

    public async Task<Delegation> CreateAsync(Delegation delegation)
    {
        await _collection.InsertOneAsync(delegation);
        return delegation;
    }

    public async Task<List<Delegation>> GetByDelegatorAsync(string delegatorUsername)
    {
        var filter = Builders<Delegation>.Filter.Eq(d => d.DelegatorUsername, delegatorUsername);
        return await _collection.Find(filter).SortByDescending(d => d.CreatedAt).ToListAsync();
    }

    public async Task<List<Delegation>> GetActiveDelegationsForDelegateAsync(string delegateUsername)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<Delegation>.Filter.And(
            Builders<Delegation>.Filter.Eq(d => d.DelegateUsername, delegateUsername),
            Builders<Delegation>.Filter.Eq(d => d.IsActive, true),
            Builders<Delegation>.Filter.Or(
                Builders<Delegation>.Filter.Eq(d => d.ExpiresAt, null),
                Builders<Delegation>.Filter.Gt(d => d.ExpiresAt, now)
            )
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<Delegation>> GetActiveDelegationsByDelegatorAsync(string delegatorUsername)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<Delegation>.Filter.And(
            Builders<Delegation>.Filter.Eq(d => d.DelegatorUsername, delegatorUsername),
            Builders<Delegation>.Filter.Eq(d => d.IsActive, true),
            Builders<Delegation>.Filter.Or(
                Builders<Delegation>.Filter.Eq(d => d.ExpiresAt, null),
                Builders<Delegation>.Filter.Gt(d => d.ExpiresAt, now)
            )
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<bool> RevokeAsync(string id, string delegatorUsername)
    {
        var filter = Builders<Delegation>.Filter.And(
            Builders<Delegation>.Filter.Eq(d => d.Id, id),
            Builders<Delegation>.Filter.Eq(d => d.DelegatorUsername, delegatorUsername)
        );
        var update = Builders<Delegation>.Update.Set(d => d.IsActive, false);
        var result = await _collection.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }
}
