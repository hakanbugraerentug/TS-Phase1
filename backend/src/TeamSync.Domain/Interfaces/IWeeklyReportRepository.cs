using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IWeeklyReportRepository
{
    Task<WeeklyReport?> GetByUsernameAndWeekAsync(string username, string weekStart);
    Task<WeeklyReport> UpsertAsync(WeeklyReport report);
    Task<WeeklyReport> UpdateReadyToReviewAsync(string username, string weekStart, bool readyToReview);
    Task<List<WeeklyReport>> GetByReviewerAsync(string reviewerUsername);
    Task<List<WeeklyReport>> GetReadyToReviewByReviewerAsync(string reviewerUsername);
}
