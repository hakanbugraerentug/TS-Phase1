namespace TeamSync.Domain.Interfaces;

public record TfsCommitInfo(
    string CommitId,
    string Comment,
    string AuthorName,
    string AuthorEmail,
    DateTime AuthorDate,
    string RepositoryName,
    string ProjectName,
    string RemoteUrl
);

public record TfsWorkItemInfo(
    int Id,
    string Title,
    string State,
    string WorkItemType,
    string? AssignedTo,
    DateTime ChangedDate,
    string Url
);

public interface ITfsService
{
    Task<List<TfsCommitInfo>> GetMyRecentCommitsAsync(string username);
    Task<List<TfsWorkItemInfo>> GetMyCompletedWorkItemsLastWeekAsync(string username);
    Task<List<TfsWorkItemInfo>> GetMyActiveWorkItemsAsync(string username);
}
