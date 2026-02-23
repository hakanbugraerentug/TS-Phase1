namespace TeamSync.Domain.Interfaces;

public interface IVlmImageService
{
    Task<string> GenerateProjectImageAsync(string title, string description);
}
