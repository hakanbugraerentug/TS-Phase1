using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IProjectRepository
{
    Task<List<Project>> GetAllAsync();
    Task<Project?> GetByIdAsync(string id);
    Task<List<Project>> GetByOwnerAsync(string owner);
    Task<Project> CreateAsync(Project project);
    Task<Project> UpdateAsync(Project project);
    Task<bool> DeleteAsync(string id);
}
