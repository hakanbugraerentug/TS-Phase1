using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;

namespace TeamSync.Application.Mappers;

public static class ProjectMapper
{
    public static ProjectDto ToDto(Project project)
    {
        return new ProjectDto
        {
            Id = project.Id,
            Title = project.Title,
            Description = project.Description,
            Owner = project.Owner,
            Members = project.Members
        };
    }
}
