using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Commands.DeleteComment;

public class DeleteCommentCommandHandler
{
    private readonly ICommentRepository _commentRepository;

    public DeleteCommentCommandHandler(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    public async Task<bool> Handle(DeleteCommentCommand command)
    {
        return await _commentRepository.DeleteAsync(command.Id);
    }
}
