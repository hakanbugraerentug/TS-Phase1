using TeamSync.Application.DTOs;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Queries.GetProjectById;

public class GetProjectByIdQueryHandler
{
    private readonly IProjectRepository _projectRepository;

    public GetProjectByIdQueryHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<ProjectDto?> Handle(GetProjectByIdQuery query)
    {
        var project = await _projectRepository.GetByIdAsync(query.Id);
        return project == null ? null : MapToDto(project);
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
