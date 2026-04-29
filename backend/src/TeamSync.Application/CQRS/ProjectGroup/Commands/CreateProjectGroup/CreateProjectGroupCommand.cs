using TeamSync.Application.DTOs;
 
namespace TeamSync.Application.CQRS.ProjectGroup.Commands.CreateProjectGroup;
 
public class CreateProjectGroupCommand
{
    public CreateProjectGroupRequest Request { get; set; } = null!;
}
 