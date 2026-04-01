using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Commands.UpdateProjectDetails;

public class UpdateProjectDetailsCommandHandler
{
    private readonly IProjectRepository _projectRepository;
    private readonly ITeamRepository _teamRepository;

    public UpdateProjectDetailsCommandHandler(IProjectRepository projectRepository, ITeamRepository teamRepository)
    {
        _projectRepository = projectRepository;
        _teamRepository = teamRepository;
    }

    public async Task<ProjectDto?> Handle(UpdateProjectDetailsCommand command)
    {
        var existingProject = await _projectRepository.GetByIdAsync(command.Id);
        if (existingProject == null)
        {
            return null;
        }

        foreach (var teamId in command.Request.IlgiliEkipIdleri)
        {
            var team = await _teamRepository.GetByIdAsync(teamId);
            if (team == null)
                throw new ArgumentException($"Ekip bulunamadı: '{teamId}'");
        }

        existingProject.Birimler = command.Request.Birimler.Select(b => new Domain.Entities.Birim
        {
            BirimTipi = b.BirimTipi.Trim(),
            BirimAdi = b.BirimAdi.Trim(),
            SorumluKullanici = b.SorumluKullanici.Trim()
        }).ToList();
        existingProject.IlgiliEkipIdleri = command.Request.IlgiliEkipIdleri;
        existingProject.BaslamaTarihi = command.Request.BaslamaTarihi;
        existingProject.BitisTarihi = command.Request.BitisTarihi;
        existingProject.OtomatikPipeline = command.Request.OtomatikPipeline;
        existingProject.Outsource = command.Request.Outsource;
        existingProject.WikiLinki = command.Request.WikiLinki;
        existingProject.TfsLinki = command.Request.TfsLinki;

        var updatedProject = await _projectRepository.UpdateAsync(existingProject);
        return ProjectMapper.ToDto(updatedProject);
    }
}
