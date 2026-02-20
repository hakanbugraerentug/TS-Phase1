namespace TeamSync.Application.CQRS.Team.Commands.AddMember;

public class AddMemberCommand
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
