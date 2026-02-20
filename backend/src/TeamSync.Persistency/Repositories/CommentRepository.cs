using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class CommentRepository : ICommentRepository
{
    private readonly IMongoCollection<Comment> _collection;

    public CommentRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<Comment>(Comment.CollectionName);
    }

    public async Task<Comment> CreateAsync(Comment comment)
    {
        comment.Date = DateTime.UtcNow;
        await _collection.InsertOneAsync(comment);
        return comment;
    }

    public async Task<List<Comment>> GetAllAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task<List<Comment>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        var filter = Builders<Comment>.Filter.And(
            Builders<Comment>.Filter.Gte(c => c.Date, startDate),
            Builders<Comment>.Filter.Lte(c => c.Date, endDate)
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<Comment>> GetByProjectIdAsync(string projectId)
    {
        var filter = Builders<Comment>.Filter.Eq(c => c.ProjectId, projectId);
        return await _collection.Find(filter).ToListAsync();
    }
}
