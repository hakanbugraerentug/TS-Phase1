using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
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
        return projects.Select(ProjectMapper.ToDto).ToList();
    }
}
