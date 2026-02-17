using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Project.Commands.DeleteProject;

public class DeleteProjectCommandHandler
{
    private readonly IProjectRepository _projectRepository;

    public DeleteProjectCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<bool> Handle(DeleteProjectCommand command)
    {
        return await _projectRepository.DeleteAsync(command.Id);
    }
}
