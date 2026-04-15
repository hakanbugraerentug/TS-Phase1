using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.UpdateProjectGroup;

public class UpdateProjectGroupCommand
{
    public string Id { get; set; } = string.Empty;
    public UpdateProjectGroupRequest Request { get; set; } = null!;
}