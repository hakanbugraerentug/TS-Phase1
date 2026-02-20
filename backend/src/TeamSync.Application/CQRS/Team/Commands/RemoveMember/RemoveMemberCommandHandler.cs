using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Commands.RemoveMember;

public class RemoveMemberCommandHandler
{
    private readonly ITeamRepository _teamRepository;

    public RemoveMemberCommandHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<TeamDto?> Handle(RemoveMemberCommand command)
    {
        var team = await _teamRepository.RemoveMemberAsync(command.Id, command.Username);
        return team == null ? null : TeamMapper.ToDto(team);
    }
}
