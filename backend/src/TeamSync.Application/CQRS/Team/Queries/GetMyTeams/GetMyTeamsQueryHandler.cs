using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Queries.GetMyTeams;

public class GetMyTeamsQueryHandler
{
    private readonly ITeamRepository _teamRepository;

    public GetMyTeamsQueryHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<List<TeamDto>> Handle(GetMyTeamsQuery query)
    {
        var teams = await _teamRepository.GetByMemberAsync(query.Username);
        return teams.Select(TeamMapper.ToDto).ToList();
    }
}
