using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface ICommentRepository
{
    Task<Comment> CreateAsync(Comment comment);
    Task<List<Comment>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<List<Comment>> GetByProjectIdAsync(string projectId);
}
