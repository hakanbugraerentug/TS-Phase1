using TeamSync.Application.DTOs;

namespace TeamSync.Application.CQRS.Comment.Commands.AddComment;

public class AddCommentCommand
{
    public AddCommentRequest Request { get; set; } = null!;
}
