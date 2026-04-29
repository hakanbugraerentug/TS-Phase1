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
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "blue";
    public string CreatedBy { get; set; } = string.Empty;
}

public class UpdateProjectGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "blue";
    public List<string> ProjectIds { get; set; } = new();
}