using TeamSync.Application.DTOs;
using TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.CreateProjectGroup;

public class CreateProjectGroupCommandHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public CreateProjectGroupCommandHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<ProjectGroupDto> Handle(CreateProjectGroupCommand command)
    {
        var name = command.Request.Name?.Trim() ?? string.Empty;
        if (name.Length < 1 || name.Length > 100)
            throw new ArgumentException("Grup adı 1-100 karakter arasında olmalıdır.");

        var group = new Domain.Entities.ProjectGroup
        {
            Name       = name,
            Color      = command.Request.Color ?? "blue",
            CreatedBy  = command.Request.CreatedBy,
            CreatedAt  = DateTime.UtcNow,
            ProjectIds = new List<string>()
        };

        var created = await _projectGroupRepository.CreateAsync(group);
        return ProjectGroupMapper.ToDto(created);
    }
}