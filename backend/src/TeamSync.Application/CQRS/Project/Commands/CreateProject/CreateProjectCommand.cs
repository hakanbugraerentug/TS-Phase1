using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.Project.Commands.CreateProject;

public class CreateProjectCommand
{
    public CreateProjectRequest Request { get; set; } = null!;
}
