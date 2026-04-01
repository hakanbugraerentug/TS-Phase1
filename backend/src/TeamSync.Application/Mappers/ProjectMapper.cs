using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;

namespace TeamSync.Application.Mappers;

public static class ProjectMapper
{
    public static ProjectDto ToDto(Project project)
    {
        return new ProjectDto
        {
            Id = project.Id,
            Title = project.Title,
            Description = project.Description,
            Owner = project.Owner,
            Members = project.Members,
            Sorumlular = project.Sorumlular.Select(s => new SorumluDto { Etiket = s.Etiket, Isim = s.Isim }).ToList(),
            Birimler = project.Birimler.Select(b => new BirimDto { BirimTipi = b.BirimTipi, BirimAdi = b.BirimAdi, SorumluKullanici = b.SorumluKullanici }).ToList(),
            IlgiliEkipIdleri = project.IlgiliEkipIdleri,
            CardImage = project.CardImage,
            BaslamaTarihi = project.BaslamaTarihi,
            BitisTarihi = project.BitisTarihi,
            OtomatikPipeline = project.OtomatikPipeline,
            Outsource = project.Outsource,
            WikiLinki = project.WikiLinki,
            TfsLinki = project.TfsLinki
        };
    }
}
