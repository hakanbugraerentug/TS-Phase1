using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;

namespace TeamSync.Application.Mappers;

public static class TeamMapper
{
    public static TeamDto ToDto(Team team)
    {
        return new TeamDto
        {
            Id = team.Id,
            Title = team.Title,
            Description = team.Description,
            Leader = team.Leader,
            Members = team.Members,
            ProjectId = team.ProjectId
        };
    }
}
