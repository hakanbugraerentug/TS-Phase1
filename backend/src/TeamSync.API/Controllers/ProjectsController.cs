using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Application.CQRS.Project.Commands.CreateProject;
using TeamSync.Application.CQRS.Project.Commands.UpdateProject;
using TeamSync.Application.CQRS.Project.Commands.DeleteProject;
using TeamSync.Application.CQRS.Project.Queries.GetAllProjects;
using TeamSync.Application.CQRS.Project.Queries.GetProjectById;
using TeamSync.Application.CQRS.Project.Queries.GetProjectsByOwner;
using TeamSync.Application.DTOs;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly CreateProjectCommandHandler _createProjectHandler;
    private readonly UpdateProjectCommandHandler _updateProjectHandler;
    private readonly DeleteProjectCommandHandler _deleteProjectHandler;
    private readonly GetAllProjectsQueryHandler _getAllProjectsHandler;
    private readonly GetProjectByIdQueryHandler _getProjectByIdHandler;
    private readonly GetProjectsByOwnerQueryHandler _getProjectsByOwnerHandler;

    public ProjectsController(
        CreateProjectCommandHandler createProjectHandler,
        UpdateProjectCommandHandler updateProjectHandler,
        DeleteProjectCommandHandler deleteProjectHandler,
        GetAllProjectsQueryHandler getAllProjectsHandler,
        GetProjectByIdQueryHandler getProjectByIdHandler,
        GetProjectsByOwnerQueryHandler getProjectsByOwnerHandler)
    {
        _createProjectHandler = createProjectHandler;
        _updateProjectHandler = updateProjectHandler;
        _deleteProjectHandler = deleteProjectHandler;
        _getAllProjectsHandler = getAllProjectsHandler;
        _getProjectByIdHandler = getProjectByIdHandler;
        _getProjectsByOwnerHandler = getProjectsByOwnerHandler;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetAll()
    {
        var query = new GetAllProjectsQuery();
        var result = await _getAllProjectsHandler.Handle(query);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetById(string id)
    {
        var query = new GetProjectByIdQuery { Id = id };
        var result = await _getProjectByIdHandler.Handle(query);
        
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpGet("owner/{username}")]
    public async Task<ActionResult<List<ProjectDto>>> GetByOwner(string username)
    {
        var query = new GetProjectsByOwnerQuery { Owner = username };
        var result = await _getProjectsByOwnerHandler.Handle(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectRequest request)
    {
        var command = new CreateProjectCommand { Request = request };
        var result = await _createProjectHandler.Handle(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProjectDto>> Update(string id, [FromBody] UpdateProjectRequest request)
    {
        var command = new UpdateProjectCommand { Id = id, Request = request };
        var result = await _updateProjectHandler.Handle(command);
        
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var command = new DeleteProjectCommand { Id = id };
        var result = await _deleteProjectHandler.Handle(command);
        
        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }
}
