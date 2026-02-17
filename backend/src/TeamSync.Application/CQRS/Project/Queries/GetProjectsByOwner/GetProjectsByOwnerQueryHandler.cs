using TeamSync.Application.DTOs;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Queries.GetProjectsByOwner;

public class GetProjectsByOwnerQueryHandler
{
    private readonly IProjectRepository _projectRepository;

    public GetProjectsByOwnerQueryHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<List<ProjectDto>> Handle(GetProjectsByOwnerQuery query)
    {
        var projects = await _projectRepository.GetByOwnerAsync(query.Owner);
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
