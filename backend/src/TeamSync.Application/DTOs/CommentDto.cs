namespace TeamSync.Application.DTOs;

public class CommentDto
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string ProjectId { get; set; } = string.Empty;
}

public class AddCommentRequest
{
    public string Username { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
}
