using System.ComponentModel.DataAnnotations;

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
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Leader { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    [Required]
    public string ProjectId { get; set; } = string.Empty;
}

public class SetLeaderRequest
{
    [Required]
    public string LeaderUsername { get; set; } = string.Empty;
}

public class AddMemberRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;
}

public class RemoveMemberRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;
}
