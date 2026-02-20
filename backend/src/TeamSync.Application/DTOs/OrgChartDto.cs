namespace TeamSync.Application.DTOs;

public class OrgChartDto
{
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string DistinguishedName { get; set; } = string.Empty;
    public bool IsActiveUser { get; set; }
    public OrgChartDto? Manager { get; set; }
    public List<OrgChartDto> Siblings { get; set; } = new();
}
