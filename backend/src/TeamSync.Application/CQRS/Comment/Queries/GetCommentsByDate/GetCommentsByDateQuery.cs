namespace TeamSync.Application.CQRS.Comment.Queries.GetCommentsByDate;

public class GetCommentsByDateQuery
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}
