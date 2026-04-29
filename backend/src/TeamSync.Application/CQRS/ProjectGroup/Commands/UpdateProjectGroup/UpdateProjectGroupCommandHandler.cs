using TeamSync.Application.DTOs;
using TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.UpdateProjectGroup;

public class UpdateProjectGroupCommandHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public UpdateProjectGroupCommandHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<ProjectGroupDto?> Handle(UpdateProjectGroupCommand command)
    {
        var existing = await _projectGroupRepository.GetByIdAsync(command.Id);
        if (existing == null) return null;

        existing.Name       = command.Request.Name?.Trim() ?? existing.Name;
        existing.Color      = command.Request.Color ?? existing.Color;
        existing.ProjectIds = command.Request.ProjectIds ?? existing.ProjectIds;

        var updated = await _projectGroupRepository.UpdateAsync(command.Id, existing);
        return updated == null ? null : ProjectGroupMapper.ToDto(updated);
    }
}