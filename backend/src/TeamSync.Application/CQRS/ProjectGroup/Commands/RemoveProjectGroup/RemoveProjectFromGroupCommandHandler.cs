using TeamSync.Application.DTOs;
using TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.RemoveProjectFromGroup;

public class RemoveProjectFromGroupCommandHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public RemoveProjectFromGroupCommandHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<ProjectGroupDto?> Handle(RemoveProjectFromGroupCommand command)
    {
        var group = await _projectGroupRepository.GetByIdAsync(command.GroupId);
        if (group == null) return null;

        group.ProjectIds.Remove(command.ProjectId);

        var updated = await _projectGroupRepository.UpdateAsync(command.GroupId, group);
        return updated == null ? null : ProjectGroupMapper.ToDto(updated);
    }
}