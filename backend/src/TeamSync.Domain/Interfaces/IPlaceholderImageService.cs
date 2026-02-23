namespace TeamSync.Domain.Interfaces;

public interface IPlaceholderImageService
{
    Task<string> GenerateAsync(string projectId);
}
