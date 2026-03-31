using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IWeeklyReportRepository
{
    Task<WeeklyReport?> GetByUsernameAndWeekAsync(string username, string weekStart);
    Task<WeeklyReport> UpsertAsync(WeeklyReport report);
}
