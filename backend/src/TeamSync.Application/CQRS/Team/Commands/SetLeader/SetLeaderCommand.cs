namespace TeamSync.Application.CQRS.Team.Commands.SetLeader;

public class SetLeaderCommand
{
    public string Id { get; set; } = string.Empty;
    public string LeaderUsername { get; set; } = string.Empty;
}
