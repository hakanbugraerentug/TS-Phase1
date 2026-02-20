using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Commands.AddMember;

public class AddMemberCommandHandler
{
    private readonly ITeamRepository _teamRepository;

    public AddMemberCommandHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<TeamDto?> Handle(AddMemberCommand command)
    {
        var team = await _teamRepository.AddMemberAsync(command.Id, command.Username);
        return team == null ? null : TeamMapper.ToDto(team);
    }
}
