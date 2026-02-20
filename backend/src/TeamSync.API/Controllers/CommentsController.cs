using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Application.CQRS.Comment.Commands.AddComment;
using TeamSync.Application.CQRS.Comment.Queries.GetAllComments;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByDate;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByProject;
using TeamSync.Application.DTOs;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly AddCommentCommandHandler _addCommentHandler;
    private readonly GetAllCommentsQueryHandler _getAllCommentsHandler;
    private readonly GetCommentsByDateQueryHandler _getCommentsByDateHandler;
    private readonly GetCommentsByProjectQueryHandler _getCommentsByProjectHandler;

    public CommentsController(
        AddCommentCommandHandler addCommentHandler,
        GetAllCommentsQueryHandler getAllCommentsHandler,
        GetCommentsByDateQueryHandler getCommentsByDateHandler,
        GetCommentsByProjectQueryHandler getCommentsByProjectHandler)
    {
        _addCommentHandler = addCommentHandler;
        _getAllCommentsHandler = getAllCommentsHandler;
        _getCommentsByDateHandler = getCommentsByDateHandler;
        _getCommentsByProjectHandler = getCommentsByProjectHandler;
    }

    [HttpGet]
    public async Task<ActionResult<List<CommentDto>>> GetAll()
    {
        var query = new GetAllCommentsQuery();
        var result = await _getAllCommentsHandler.Handle(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CommentDto>> AddComment([FromBody] AddCommentRequest request)
    {
        var command = new AddCommentCommand { Request = request };
        var result = await _addCommentHandler.Handle(command);
        return StatusCode(201, result);
    }

    [HttpGet("by-date")]
    public async Task<ActionResult<List<CommentDto>>> GetCommentsByDate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var query = new GetCommentsByDateQuery { StartDate = startDate, EndDate = endDate };
        var result = await _getCommentsByDateHandler.Handle(query);
        return Ok(result);
    }

    [HttpGet("project/{projectId}")]
    [HttpGet("by-project/{projectId}")]
    public async Task<ActionResult<List<CommentDto>>> GetCommentsByProject(string projectId)
    {
        var query = new GetCommentsByProjectQuery { ProjectId = projectId };
        var result = await _getCommentsByProjectHandler.Handle(query);
        return Ok(result);
    }
}
