using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Commands.CreateProject;

public class CreateProjectCommandHandler
{
    private readonly IProjectRepository _projectRepository;

    public CreateProjectCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<ProjectDto> Handle(CreateProjectCommand command)
    {
        var project = new Domain.Entities.Project
        {
            Title = command.Request.Title,
            Description = command.Request.Description,
            Owner = command.Request.Owner,
            Members = command.Request.Members
        };

        var createdProject = await _projectRepository.CreateAsync(project);
        return ProjectMapper.ToDto(createdProject);
    }
}
