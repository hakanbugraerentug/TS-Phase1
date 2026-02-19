using TeamSync.Application.DTOs;
using TeamSync.Application.Mappers;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.CQRS.Comment.Queries.GetCommentsByDate;

public class GetCommentsByDateQueryHandler
{
    private readonly ICommentRepository _commentRepository;

    public GetCommentsByDateQueryHandler(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsByDateQuery query)
    {
        var comments = await _commentRepository.GetByDateRangeAsync(query.StartDate, query.EndDate);
        return comments.Select(CommentMapper.ToDto).ToList();
    }
}
