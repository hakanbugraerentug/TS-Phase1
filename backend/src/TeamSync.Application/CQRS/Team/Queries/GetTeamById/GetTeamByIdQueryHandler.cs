using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Queries.GetTeamById;

public class GetTeamByIdQueryHandler
{
    private readonly ITeamRepository _teamRepository;

    public GetTeamByIdQueryHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<TeamDto?> Handle(GetTeamByIdQuery query)
    {
        var team = await _teamRepository.GetByIdAsync(query.Id);
        return team == null ? null : TeamMapper.ToDto(team);
    }
}
