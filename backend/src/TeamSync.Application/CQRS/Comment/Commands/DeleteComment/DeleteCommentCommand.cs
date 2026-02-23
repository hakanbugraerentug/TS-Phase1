namespace TeamSync.Application.CQRS.Comment.Commands.DeleteComment;

public class DeleteCommentCommand
{
    public string Id { get; set; } = string.Empty;
    public string RequestingUsername { get; set; } = string.Empty;
}
