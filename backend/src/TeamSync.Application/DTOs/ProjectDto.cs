namespace TeamSync.Application.DTOs;

public class SorumluDto
{
    public string Etiket { get; set; } = string.Empty;
    public string Isim { get; set; } = string.Empty;
}

public class BirimDto
{
    public string BirimTipi { get; set; } = string.Empty;
    public string BirimAdi { get; set; } = string.Empty;
    public string SorumluKullanici { get; set; } = string.Empty;
}

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public List<SorumluDto> Sorumlular { get; set; } = new();
    public List<BirimDto> Birimler { get; set; } = new();
    public List<string> IlgiliEkipIdleri { get; set; } = new();
    public string? CardImage { get; set; }
    public string? BaslamaTarihi { get; set; }
    public string? BitisTarihi { get; set; }
    public bool OtomatikPipeline { get; set; }
    public bool Outsource { get; set; }
    public string? WikiLinki { get; set; }
    public string? TfsLinki { get; set; }
}

public class CreateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
    public List<SorumluDto> Sorumlular { get; set; } = new();
    public List<BirimDto> Birimler { get; set; } = new();
    public List<string> IlgiliEkipIdleri { get; set; } = new();
    public string? BaslamaTarihi { get; set; }
    public string? BitisTarihi { get; set; }
    public bool OtomatikPipeline { get; set; }
    public bool Outsource { get; set; }
    public string? WikiLinki { get; set; }
    public string? TfsLinki { get; set; }
}

public class UpdateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public List<string> Members { get; set; } = new();
}

public class UpdateProjectDetailsRequest
{
    public List<BirimDto> Birimler { get; set; } = new();
    public List<string> IlgiliEkipIdleri { get; set; } = new();
    public string? BaslamaTarihi { get; set; }
    public string? BitisTarihi { get; set; }
    public bool OtomatikPipeline { get; set; }
    public bool Outsource { get; set; }
    public string? WikiLinki { get; set; }
    public string? TfsLinki { get; set; }
}
