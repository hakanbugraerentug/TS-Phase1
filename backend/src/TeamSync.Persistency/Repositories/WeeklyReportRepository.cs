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

        // FindOneAndReplace ile upsert yapıldığında MongoDB yeni bir _id üretiyor
        // ve mevcut dökümanın immutable _id'siyle çakışıyor.
        // Çözüm: Update builder ile sadece değişen alanları set et;
        // _id'ye hiç dokunulmuyor.
        var update = Builders<WeeklyReport>.Update
            .Set(r => r.ReportData,    report.ReportData)
            .Set(r => r.SavedAt,       report.SavedAt)
            .Set(r => r.Author,        report.Author)
            .Set(r => r.Date,          report.Date)
            .Set(r => r.Reviewer,      report.Reviewer)
            .Set(r => r.Reviewers,     report.Reviewers)
            .Set(r => r.ReadyToReview, report.ReadyToReview)
            .Set(r => r.Status,        report.Status)
            // Sadece ilk insert'te Username ve WeekStart yazılır
            .SetOnInsert(r => r.Username,  report.Username)
            .SetOnInsert(r => r.WeekStart, report.WeekStart);

        var options = new FindOneAndUpdateOptions<WeeklyReport>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };

        return await _collection.FindOneAndUpdateAsync(filter, update, options)
               ?? report;
    }

    public async Task<WeeklyReport> UpdateReadyToReviewAsync(string username, string weekStart, bool readyToReview)
    {
        var filter = Builders<WeeklyReport>.Filter.And(
            Builders<WeeklyReport>.Filter.Eq(r => r.Username, username),
            Builders<WeeklyReport>.Filter.Eq(r => r.WeekStart, weekStart)
        );
        var update = Builders<WeeklyReport>.Update.Set(r => r.ReadyToReview, readyToReview);
        var options = new FindOneAndUpdateOptions<WeeklyReport>
        {
            ReturnDocument = ReturnDocument.After
        };
        return await _collection.FindOneAndUpdateAsync(filter, update, options)
               ?? throw new InvalidOperationException("Report not found.");
    }

    public async Task<List<WeeklyReport>> GetByReviewerAsync(string reviewerUsername)
    {
        var filter = Builders<WeeklyReport>.Filter.Or(
            Builders<WeeklyReport>.Filter.Eq(r => r.Reviewer, reviewerUsername),
            Builders<WeeklyReport>.Filter.AnyEq(r => r.Reviewers, reviewerUsername)
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<WeeklyReport>> GetByReviewerAndWeekAsync(string reviewerUsername, string weekStart)
    {
        var filter = Builders<WeeklyReport>.Filter.And(
            Builders<WeeklyReport>.Filter.Or(
                Builders<WeeklyReport>.Filter.Eq(r => r.Reviewer, reviewerUsername),
                Builders<WeeklyReport>.Filter.AnyEq(r => r.Reviewers, reviewerUsername)
            ),
            Builders<WeeklyReport>.Filter.Eq(r => r.WeekStart, weekStart)
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<WeeklyReport>> GetReadyToReviewByReviewerAsync(string reviewerUsername)
    {
        var filter = Builders<WeeklyReport>.Filter.And(
            Builders<WeeklyReport>.Filter.Or(
                Builders<WeeklyReport>.Filter.Eq(r => r.Reviewer, reviewerUsername),
                Builders<WeeklyReport>.Filter.AnyEq(r => r.Reviewers, reviewerUsername)
            ),
            Builders<WeeklyReport>.Filter.Eq(r => r.ReadyToReview, true)
        );
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<WeeklyReport>> GetAllByUsernameAsync(string username)
    {
        var filter = Builders<WeeklyReport>.Filter.Eq(r => r.Username, username);
        return await _collection.Find(filter)
            .SortByDescending(r => r.SavedAt)
            .ToListAsync();
    }
}