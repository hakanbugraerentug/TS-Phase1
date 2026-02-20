using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Commands.AddComment;

public class AddCommentCommandHandler
{
    private readonly ICommentRepository _commentRepository;

    public AddCommentCommandHandler(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    public async Task<CommentDto> Handle(AddCommentCommand command)
    {
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
