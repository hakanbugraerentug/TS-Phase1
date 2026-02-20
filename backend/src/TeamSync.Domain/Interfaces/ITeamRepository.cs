using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface ITeamRepository
{
    Task<Team> CreateAsync(Team team);
    Task<Team?> GetByIdAsync(string id);
    Task<List<Team>> GetAllAsync();
    Task<List<Team>> GetByProjectIdAsync(string projectId);
    Task<List<Team>> GetByMemberAsync(string username);
    Task<Team?> UpdateAsync(string id, Team team);
    Task<bool> DeleteAsync(string id);
    Task<Team?> SetLeaderAsync(string id, string leaderUsername);
    Task<Team?> AddMemberAsync(string id, string username);
    Task<Team?> RemoveMemberAsync(string id, string username);
}
