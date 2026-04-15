using TeamSync.Application.DTOs;
using TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.AddProjectToGroup;

public class AddProjectToGroupCommandHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public AddProjectToGroupCommandHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<ProjectGroupDto?> Handle(AddProjectToGroupCommand command)
    {
        var group = await _projectGroupRepository.GetByIdAsync(command.GroupId);
        if (group == null) return null;

        if (!group.ProjectIds.Contains(command.ProjectId))
            group.ProjectIds.Add(command.ProjectId);

        var updated = await _projectGroupRepository.UpdateAsync(command.GroupId, group);
        return updated == null ? null : ProjectGroupMapper.ToDto(updated);
    }
}