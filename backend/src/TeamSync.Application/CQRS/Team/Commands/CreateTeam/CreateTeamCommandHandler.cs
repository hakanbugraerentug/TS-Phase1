using TeamSync.Application.DTOs;
using TeamSync.Application.Helpers;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Commands.CreateTeam;

public class CreateTeamCommandHandler
{
    private readonly ITeamRepository _teamRepository;
    private readonly IUserRepository _userRepository;

    public CreateTeamCommandHandler(ITeamRepository teamRepository, IUserRepository userRepository)
    {
        _teamRepository = teamRepository;
        _userRepository = userRepository;
    }

    public async Task<TeamDto> Handle(CreateTeamCommand command)
    {
        var requester = await _userRepository.GetByUsernameAsync(command.RequesterUsername);
        var requesterTitle = requester?.Title ?? string.Empty;

        if (!TitleHelper.IsElevatedTitle(requesterTitle))
        {
            var members = command.Request.Members ?? new List<string>();
            if (!members.Contains(command.RequesterUsername))
            {
                throw new UnauthorizedAccessException(
                    "Mühendisler yalnızca kendilerinin dahil olduğu ekipleri oluşturabilir.");
            }
        }

        var team = new Domain.Entities.Team
        {
            Title = command.Request.Title,
            Description = command.Request.Description,
            Leader = command.Request.Leader,
            Members = command.Request.Members ?? new List<string>(),
            ProjectId = command.Request.ProjectId
        };

        var createdTeam = await _teamRepository.CreateAsync(team);
        return TeamMapper.ToDto(createdTeam);
    }
}
