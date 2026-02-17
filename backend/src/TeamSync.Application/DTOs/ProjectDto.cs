namespace TeamSync.Application.DTOs;

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
}

public class CreateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
}

public class UpdateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
}
