namespace TeamSync.Application.DTOs;

public class TeamDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Leader { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public string ProjectId { get; set; } = string.Empty;
}

public class CreateTeamRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Leader { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public string ProjectId { get; set; } = string.Empty;
}

public class SetLeaderRequest
{
    public string LeaderUsername { get; set; } = string.Empty;
}

public class AddMemberRequest
{
    public string Username { get; set; } = string.Empty;
}

public class RemoveMemberRequest
{
    public string Username { get; set; } = string.Empty;
}
