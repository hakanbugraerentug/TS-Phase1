using TeamSync.Application.DTOs;
using TeamSync.Application.Helpers;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Team.Queries.GetAllTeams;

public class GetAllTeamsQueryHandler
{
    private readonly ITeamRepository _teamRepository;
    private readonly IUserRepository _userRepository;

    public GetAllTeamsQueryHandler(ITeamRepository teamRepository, IUserRepository userRepository)
    {
        _teamRepository = teamRepository;
        _userRepository = userRepository;
    }

    public async Task<List<TeamDto>> Handle(GetAllTeamsQuery query)
    {
        var requester = await _userRepository.GetByUsernameAsync(query.RequesterUsername);
        var requesterTitle = requester?.Title ?? string.Empty;

        if (TitleHelper.IsElevatedTitle(requesterTitle))
        {
            var subordinates = await _userRepository.GetSubordinatesAsync(query.RequesterUsername);
            var visibleUsernames = new HashSet<string>(subordinates) { query.RequesterUsername };

            var allTeams = await _teamRepository.GetAllAsync();
            var filteredTeams = allTeams
                .Where(t => t.Members.Any(m => visibleUsernames.Contains(m)))
                .ToList();
            return filteredTeams.Select(TeamMapper.ToDto).ToList();
        }
        else
        {
            var teams = await _teamRepository.GetByMemberAsync(query.RequesterUsername);
            return teams.Select(TeamMapper.ToDto).ToList();
        }
    }
}
