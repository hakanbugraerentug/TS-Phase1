using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Application.CQRS.Team.Commands.CreateTeam;
using TeamSync.Application.CQRS.Team.Commands.SetLeader;
using TeamSync.Application.CQRS.Team.Commands.AddMember;
using TeamSync.Application.CQRS.Team.Commands.RemoveMember;
using TeamSync.Application.CQRS.Team.Queries.GetAllTeams;
using TeamSync.Application.CQRS.Team.Queries.GetTeamById;
using TeamSync.Application.CQRS.Team.Queries.GetTeamsByProject;
using TeamSync.Application.CQRS.Team.Queries.GetMyTeams;
using TeamSync.Application.DTOs;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly CreateTeamCommandHandler _createTeamHandler;
    private readonly SetLeaderCommandHandler _setLeaderHandler;
    private readonly AddMemberCommandHandler _addMemberHandler;
    private readonly RemoveMemberCommandHandler _removeMemberHandler;
    private readonly GetAllTeamsQueryHandler _getAllTeamsHandler;
    private readonly GetTeamByIdQueryHandler _getTeamByIdHandler;
    private readonly GetTeamsByProjectQueryHandler _getTeamsByProjectHandler;
    private readonly GetMyTeamsQueryHandler _getMyTeamsHandler;

    public TeamsController(
        CreateTeamCommandHandler createTeamHandler,
        SetLeaderCommandHandler setLeaderHandler,
        AddMemberCommandHandler addMemberHandler,
        RemoveMemberCommandHandler removeMemberHandler,
        GetAllTeamsQueryHandler getAllTeamsHandler,
        GetTeamByIdQueryHandler getTeamByIdHandler,
        GetTeamsByProjectQueryHandler getTeamsByProjectHandler,
        GetMyTeamsQueryHandler getMyTeamsHandler)
    {
        _createTeamHandler = createTeamHandler;
        _setLeaderHandler = setLeaderHandler;
        _addMemberHandler = addMemberHandler;
        _removeMemberHandler = removeMemberHandler;
        _getAllTeamsHandler = getAllTeamsHandler;
        _getTeamByIdHandler = getTeamByIdHandler;
        _getTeamsByProjectHandler = getTeamsByProjectHandler;
        _getMyTeamsHandler = getMyTeamsHandler;
    }

    [HttpGet]
    public async Task<ActionResult<List<TeamDto>>> GetAll()
    {
        var query = new GetAllTeamsQuery();
        var result = await _getAllTeamsHandler.Handle(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TeamDto>> Create([FromBody] CreateTeamRequest request)
    {
        var command = new CreateTeamCommand { Request = request };
        var result = await _createTeamHandler.Handle(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TeamDto>> GetById(string id)
    {
        var query = new GetTeamByIdQuery { Id = id };
        var result = await _getTeamByIdHandler.Handle(query);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<List<TeamDto>>> GetByProject(string projectId)
    {
        var query = new GetTeamsByProjectQuery { ProjectId = projectId };
        var result = await _getTeamsByProjectHandler.Handle(query);
        return Ok(result);
    }

    [HttpGet("my-teams")]
    public async Task<ActionResult<List<TeamDto>>> GetMyTeams()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
        {
            return Unauthorized();
        }

        var query = new GetMyTeamsQuery { Username = username };
        var result = await _getMyTeamsHandler.Handle(query);
        return Ok(result);
    }

    [HttpPut("{id}/leader")]
    public async Task<ActionResult<TeamDto>> SetLeader(string id, [FromBody] SetLeaderRequest request)
    {
        var command = new SetLeaderCommand { Id = id, LeaderUsername = request.LeaderUsername };
        var result = await _setLeaderHandler.Handle(command);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPost("{id}/members")]
    public async Task<ActionResult<TeamDto>> AddMember(string id, [FromBody] AddMemberRequest request)
    {
        var command = new AddMemberCommand { Id = id, Username = request.Username };
        var result = await _addMemberHandler.Handle(command);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpDelete("{id}/members/{username}")]
    public async Task<ActionResult<TeamDto>> RemoveMember(string id, string username)
    {
        var command = new RemoveMemberCommand { Id = id, Username = username };
        var result = await _removeMemberHandler.Handle(command);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }
}
