using System.ComponentModel.DataAnnotations;

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
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    [Required]
    [StringLength(5000, MinimumLength = 1)]
    public string Text { get; set; } = string.Empty;
    [Required]
    public string Author { get; set; } = string.Empty;
}
