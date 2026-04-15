using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IProjectGroupRepository
{
    Task<List<ProjectGroup>> GetAllAsync();
    Task<List<ProjectGroup>> GetByCreatedByAsync(string username);
    Task<ProjectGroup?> GetByIdAsync(string id);
    Task<ProjectGroup> CreateAsync(ProjectGroup group);
    Task<ProjectGroup?> UpdateAsync(string id, ProjectGroup group);
    Task<bool> DeleteAsync(string id);
}