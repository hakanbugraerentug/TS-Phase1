using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.Project.Commands.UpdateProjectDetails;

public class UpdateProjectDetailsCommand
{
    public string Id { get; set; } = string.Empty;
    public UpdateProjectDetailsRequest Request { get; set; } = new();
}
