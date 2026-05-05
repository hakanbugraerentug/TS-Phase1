using System.ComponentModel.DataAnnotations;

namespace TeamSync.Application.DTOs;

public class ProjectGroupDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "blue";
    public List<string> ProjectIds { get; set; } = new();
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateProjectGroupRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "blue";
    [Required]
    public string CreatedBy { get; set; } = string.Empty;
}

public class UpdateProjectGroupRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "blue";
    public List<string> ProjectIds { get; set; } = new();
}