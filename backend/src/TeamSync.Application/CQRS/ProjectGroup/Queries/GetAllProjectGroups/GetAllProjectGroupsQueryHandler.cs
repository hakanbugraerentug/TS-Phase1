using TeamSync.Application.DTOs;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;

public class GetAllProjectGroupsQueryHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public GetAllProjectGroupsQueryHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<List<ProjectGroupDto>> Handle(GetAllProjectGroupsQuery _)
    {
        var groups = await _projectGroupRepository.GetAllAsync();
        return groups.Select(ProjectGroupMapper.ToDto).ToList();
    }
}