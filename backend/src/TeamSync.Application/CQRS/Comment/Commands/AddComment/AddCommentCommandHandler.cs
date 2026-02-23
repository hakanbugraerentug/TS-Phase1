using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Commands.AddComment;

public class AddCommentCommandHandler
{
    private readonly ICommentRepository _commentRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly ITeamRepository _teamRepository;

    public AddCommentCommandHandler(
        ICommentRepository commentRepository,
        IProjectRepository projectRepository,
        ITeamRepository teamRepository)
    {
        _commentRepository = commentRepository;
        _projectRepository = projectRepository;
        _teamRepository = teamRepository;
    }

    public async Task<CommentDto> Handle(AddCommentCommand command)
    {
        // 1. Validate project exists
        var project = await _projectRepository.GetByIdAsync(command.Request.ProjectId);
        if (project == null)
            throw new ArgumentException($"Proje bulunamadı: '{command.Request.ProjectId}'");

        // 2. Authorization check
        if (project.IlgiliEkipIdleri.Count > 0)
        {
            bool authorized = false;
            foreach (var teamId in project.IlgiliEkipIdleri)
            {
                var team = await _teamRepository.GetByIdAsync(teamId);
                if (team != null && team.Members.Contains(command.Request.Author))
                {
                    authorized = true;
                    break;
                }
            }
            if (!authorized)
                throw new UnauthorizedAccessException("Bu projeye yalnızca ilgili ekipler yorum yapabilir.");
        }

        var comment = new Domain.Entities.Comment
        {
            Username = command.Request.Author,
            Content = command.Request.Text,
            ProjectId = command.Request.ProjectId
        };

        var createdComment = await _commentRepository.CreateAsync(comment);
        return CommentMapper.ToDto(createdComment);
    }
}
