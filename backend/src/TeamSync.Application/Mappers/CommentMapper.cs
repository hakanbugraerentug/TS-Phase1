using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;

namespace TeamSync.Application.Mappers;

public static class CommentMapper
{
    public static CommentDto ToDto(Comment comment)
    {
        return new CommentDto
        {
            Id = comment.Id,
            Username = comment.Username,
            Content = comment.Content,
            Date = comment.Date,
            ProjectId = comment.ProjectId
        };
    }
}
