using TeamSync.Application.DTOs;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Queries.GetAllProjects;

public class GetAllProjectsQueryHandler
{
    private readonly IProjectRepository _projectRepository;

    public GetAllProjectsQueryHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<List<ProjectDto>> Handle(GetAllProjectsQuery query)
    {
        var projects = await _projectRepository.GetAllAsync();
        return projects.Select(MapToDto).ToList();
    }

    private static ProjectDto MapToDto(Domain.Entities.Project project)
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
