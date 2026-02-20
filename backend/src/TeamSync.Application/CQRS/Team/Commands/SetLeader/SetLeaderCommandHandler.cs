using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Commands.SetLeader;

public class SetLeaderCommandHandler
{
    private readonly ITeamRepository _teamRepository;

    public SetLeaderCommandHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<TeamDto?> Handle(SetLeaderCommand command)
    {
        var team = await _teamRepository.SetLeaderAsync(command.Id, command.LeaderUsername);
        return team == null ? null : TeamMapper.ToDto(team);
    }
}
