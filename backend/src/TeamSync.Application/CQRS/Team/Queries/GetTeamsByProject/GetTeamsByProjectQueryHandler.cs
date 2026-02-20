using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Queries.GetTeamsByProject;

public class GetTeamsByProjectQueryHandler
{
    private readonly ITeamRepository _teamRepository;

    public GetTeamsByProjectQueryHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<List<TeamDto>> Handle(GetTeamsByProjectQuery query)
    {
        var teams = await _teamRepository.GetByProjectIdAsync(query.ProjectId);
        return teams.Select(TeamMapper.ToDto).ToList();
    }
}
