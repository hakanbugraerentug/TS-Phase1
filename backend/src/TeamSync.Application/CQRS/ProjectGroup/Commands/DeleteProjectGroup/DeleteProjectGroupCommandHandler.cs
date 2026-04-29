using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.ProjectGroup.Commands.DeleteProjectGroup;

public class DeleteProjectGroupCommandHandler
{
    private readonly IProjectGroupRepository _projectGroupRepository;

    public DeleteProjectGroupCommandHandler(IProjectGroupRepository projectGroupRepository)
    {
        _projectGroupRepository = projectGroupRepository;
    }

    public async Task<bool> Handle(DeleteProjectGroupCommand command)
    {
        return await _projectGroupRepository.DeleteAsync(command.Id);
    }
}