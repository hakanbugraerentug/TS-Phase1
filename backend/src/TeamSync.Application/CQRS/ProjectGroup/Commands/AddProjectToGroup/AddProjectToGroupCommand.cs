namespace TeamSync.Application.CQRS.ProjectGroup.Commands.AddProjectToGroup;

public class AddProjectToGroupCommand
{
    public string GroupId   { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
}