using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Commands.UpdateProject;

public class UpdateProjectCommandHandler
{
    private readonly IProjectRepository _projectRepository;

    public UpdateProjectCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<ProjectDto?> Handle(UpdateProjectCommand command)
    {
        var existingProject = await _projectRepository.GetByIdAsync(command.Id);
        if (existingProject == null)
        {
            return null;
        }

        existingProject.Title = command.Request.Title;
        existingProject.Description = command.Request.Description;
        existingProject.Owner = command.Request.Owner;
        existingProject.Members = command.Request.Members;

        var updatedProject = await _projectRepository.UpdateAsync(existingProject);
        return ProjectMapper.ToDto(updatedProject);
    }
}
