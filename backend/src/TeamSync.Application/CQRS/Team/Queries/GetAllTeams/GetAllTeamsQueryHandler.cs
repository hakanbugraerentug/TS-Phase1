using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Queries.GetAllTeams;

public class GetAllTeamsQueryHandler
{
    private readonly ITeamRepository _teamRepository;

    public GetAllTeamsQueryHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<List<TeamDto>> Handle(GetAllTeamsQuery query)
    {
        var teams = await _teamRepository.GetAllAsync();
        return teams.Select(TeamMapper.ToDto).ToList();
    }
}
