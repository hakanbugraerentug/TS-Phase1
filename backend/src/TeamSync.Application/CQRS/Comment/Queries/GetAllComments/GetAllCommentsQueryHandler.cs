using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Queries.GetAllComments;

public class GetAllCommentsQueryHandler
{
    private readonly ICommentRepository _commentRepository;

    public GetAllCommentsQueryHandler(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    public async Task<List<CommentDto>> Handle(GetAllCommentsQuery query)
    {
        var comments = await _commentRepository.GetAllAsync();
        return comments.Select(CommentMapper.ToDto).ToList();
    }
}
