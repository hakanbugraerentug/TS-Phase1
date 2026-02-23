namespace TeamSync.Application.DTOs;

public class SorumluDto
{
    public string Etiket { get; set; } = string.Empty;
    public string Isim { get; set; } = string.Empty;
}

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public List<SorumluDto> Sorumlular { get; set; } = new();
    public List<string> IlgiliEkipIdleri { get; set; } = new();
    public string? CardImage { get; set; }
}

public class CreateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public List<SorumluDto> Sorumlular { get; set; } = new();
    public List<string> IlgiliEkipIdleri { get; set; } = new();
}

public class UpdateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
}
