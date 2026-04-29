namespace TeamSync.Application.CQRS.ProjectGroup.Commands.RemoveProjectFromGroup;

public class RemoveProjectFromGroupCommand
{
    public string GroupId   { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
}