using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Commands.CreateTeam;

public class CreateTeamCommandHandler
{
    private readonly ITeamRepository _teamRepository;

    public CreateTeamCommandHandler(ITeamRepository teamRepository)
    {
        _teamRepository = teamRepository;
    }

    public async Task<TeamDto> Handle(CreateTeamCommand command)
    {
        var team = new Domain.Entities.Team
        {
            Title = command.Request.Title,
            Description = command.Request.Description,
            Leader = command.Request.Leader,
            Members = command.Request.Members,
            ProjectId = command.Request.ProjectId
        };

        var createdTeam = await _teamRepository.CreateAsync(team);
        return TeamMapper.ToDto(createdTeam);
    }
}
