using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Commands.CreateProject;

public class CreateProjectCommandHandler
{
    private readonly IProjectRepository _projectRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IVlmImageService _vlmImageService;
    private readonly IPlaceholderImageService _placeholderImageService;

    public CreateProjectCommandHandler(
        IProjectRepository projectRepository,
        ITeamRepository teamRepository,
        IVlmImageService vlmImageService,
        IPlaceholderImageService placeholderImageService)
    {
        _projectRepository = projectRepository;
        _teamRepository = teamRepository;
        _vlmImageService = vlmImageService;
        _placeholderImageService = placeholderImageService;
    }

    public async Task<ProjectDto> Handle(CreateProjectCommand command)
    {
        // 1. Validate Sorumlular
        foreach (var sorumlu in command.Request.Sorumlular)
        {
            var etiket = sorumlu.Etiket?.Trim() ?? string.Empty;
            var isim = sorumlu.Isim?.Trim() ?? string.Empty;
            if (etiket.Length < 2 || etiket.Length > 60)
                throw new ArgumentException($"Sorumlu etiketi 2-60 karakter arasında olmalıdır: '{etiket}'");
            if (isim.Length < 2 || isim.Length > 60)
                throw new ArgumentException($"Sorumlu ismi 2-60 karakter arasında olmalıdır: '{isim}'");
        }

        // 2. Resolve teams
        foreach (var teamId in command.Request.IlgiliEkipIdleri)
        {
            var team = await _teamRepository.GetByIdAsync(teamId);
            if (team == null)
                throw new ArgumentException($"Ekip bulunamadı: '{teamId}'");
        }

        // 3. Generate card image via VLM (with fallback)
        string tempId = Guid.NewGuid().ToString("N")[..4];
        string cardImage;
        try
        {
            cardImage = await _vlmImageService.GenerateProjectImageAsync(command.Request.Title, command.Request.Description);
        }
        catch
        {
            cardImage = await _placeholderImageService.GenerateAsync(tempId);
        }

        // 4. Save project
        var project = new Domain.Entities.Project
        {
            Title = command.Request.Title,
            Description = command.Request.Description,
            Owner = command.Request.Owner,
            Members = command.Request.Members,
            Sorumlular = command.Request.Sorumlular.Select(s => new Domain.Entities.Sorumlu
            {
                Etiket = s.Etiket.Trim(),
                Isim = s.Isim.Trim()
            }).ToList(),
            IlgiliEkipIdleri = command.Request.IlgiliEkipIdleri,
            CardImage = cardImage
        };

        var createdProject = await _projectRepository.CreateAsync(project);
        return ProjectMapper.ToDto(createdProject);
    }
}
