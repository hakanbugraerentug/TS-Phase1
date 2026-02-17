using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
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
        return project == null ? null : ProjectMapper.ToDto(project);
    }
}
