using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Queries.GetCommentsByProject;

public class GetCommentsByProjectQueryHandler
{
    private readonly ICommentRepository _commentRepository;

    public GetCommentsByProjectQueryHandler(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsByProjectQuery query)
    {
        var comments = await _commentRepository.GetByProjectIdAsync(query.ProjectId);
        return comments.Select(CommentMapper.ToDto).ToList();
    }
}
