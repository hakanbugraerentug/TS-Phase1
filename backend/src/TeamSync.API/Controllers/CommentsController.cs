using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Application.CQRS.Comment.Commands.AddComment;
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
    private readonly GetCommentsByDateQueryHandler _getCommentsByDateHandler;
    private readonly GetCommentsByProjectQueryHandler _getCommentsByProjectHandler;

    public CommentsController(
        AddCommentCommandHandler addCommentHandler,
        GetCommentsByDateQueryHandler getCommentsByDateHandler,
        GetCommentsByProjectQueryHandler getCommentsByProjectHandler)
    {
        _addCommentHandler = addCommentHandler;
        _getCommentsByDateHandler = getCommentsByDateHandler;
        _getCommentsByProjectHandler = getCommentsByProjectHandler;
    }

    [HttpPost]
    public async Task<ActionResult<CommentDto>> AddComment([FromBody] AddCommentRequest request)
    {
        var command = new AddCommentCommand { Request = request };
        var result = await _addCommentHandler.Handle(command);
        return CreatedAtAction(nameof(GetCommentsByProject), new { projectId = result.ProjectId }, result);
    }

    [HttpGet("by-date")]
    public async Task<ActionResult<List<CommentDto>>> GetCommentsByDate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var query = new GetCommentsByDateQuery { StartDate = startDate, EndDate = endDate };
        var result = await _getCommentsByDateHandler.Handle(query);
        return Ok(result);
    }

    [HttpGet("by-project/{projectId}")]
    public async Task<ActionResult<List<CommentDto>>> GetCommentsByProject(string projectId)
    {
        var query = new GetCommentsByProjectQuery { ProjectId = projectId };
        var result = await _getCommentsByProjectHandler.Handle(query);
        return Ok(result);
    }
}
