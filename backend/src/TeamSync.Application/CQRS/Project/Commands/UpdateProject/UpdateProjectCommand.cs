using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.Project.Commands.UpdateProject;

public class UpdateProjectCommand
{
    public string Id { get; set; } = string.Empty;
    public UpdateProjectRequest Request { get; set; } = null!;
}
