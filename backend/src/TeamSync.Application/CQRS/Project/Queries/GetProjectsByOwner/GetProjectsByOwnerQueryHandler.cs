using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
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
        return projects.Select(ProjectMapper.ToDto).ToList();
    }
}
