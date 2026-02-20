using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.Team.Commands.CreateTeam;

public class CreateTeamCommand
{
    public CreateTeamRequest Request { get; set; } = null!;
}
