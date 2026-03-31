using MongoDB.Driver;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class WeeklyReportRepository : IWeeklyReportRepository
{
    private readonly IMongoCollection<WeeklyReport> _collection;

    public WeeklyReportRepository(MongoDbContext context)
    {
        _collection = context.Database.GetCollection<WeeklyReport>(WeeklyReport.CollectionName);
    }

    public async Task<WeeklyReport?> GetByUsernameAndWeekAsync(string username, string weekStart)
    {
        var filter = Builders<WeeklyReport>.Filter.And(
            Builders<WeeklyReport>.Filter.Eq(r => r.Username, username),
            Builders<WeeklyReport>.Filter.Eq(r => r.WeekStart, weekStart)
        );
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<WeeklyReport> UpsertAsync(WeeklyReport report)
    {
        report.SavedAt = DateTime.UtcNow;
        var filter = Builders<WeeklyReport>.Filter.And(
            Builders<WeeklyReport>.Filter.Eq(r => r.Username, report.Username),
            Builders<WeeklyReport>.Filter.Eq(r => r.WeekStart, report.WeekStart)
        );
        var options = new FindOneAndReplaceOptions<WeeklyReport>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };
        return await _collection.FindOneAndReplaceAsync(filter, report, options)
               ?? report;
    }
}
