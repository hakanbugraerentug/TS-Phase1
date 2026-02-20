namespace TeamSync.Application.CQRS.Team.Commands.RemoveMember;

public class RemoveMemberCommand
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
