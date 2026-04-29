using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;
using TeamSync.Application.CQRS.ProjectGroup.Commands.CreateProjectGroup;
using TeamSync.Application.CQRS.ProjectGroup.Commands.UpdateProjectGroup;
using TeamSync.Application.CQRS.ProjectGroup.Commands.DeleteProjectGroup;
using TeamSync.Application.CQRS.ProjectGroup.Commands.AddProjectToGroup;
using TeamSync.Application.CQRS.ProjectGroup.Commands.RemoveProjectFromGroup;
using TeamSync.Application.DTOs;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/project-groups")]
[Authorize]
public class ProjectGroupsController : ControllerBase
{
    private readonly GetAllProjectGroupsQueryHandler      _getAllHandler;
    private readonly CreateProjectGroupCommandHandler     _createHandler;
    private readonly UpdateProjectGroupCommandHandler     _updateHandler;
    private readonly DeleteProjectGroupCommandHandler     _deleteHandler;
    private readonly AddProjectToGroupCommandHandler      _addProjectHandler;
    private readonly RemoveProjectFromGroupCommandHandler _removeProjectHandler;

    public ProjectGroupsController(
        GetAllProjectGroupsQueryHandler      getAllHandler,
        CreateProjectGroupCommandHandler     createHandler,
        UpdateProjectGroupCommandHandler     updateHandler,
        DeleteProjectGroupCommandHandler     deleteHandler,
        AddProjectToGroupCommandHandler      addProjectHandler,
        RemoveProjectFromGroupCommandHandler removeProjectHandler)
    {
        _getAllHandler         = getAllHandler;
        _createHandler        = createHandler;
        _updateHandler        = updateHandler;
        _deleteHandler        = deleteHandler;
        _addProjectHandler    = addProjectHandler;
        _removeProjectHandler = removeProjectHandler;
    }

    // GET /api/project-groups
    [HttpGet]
    public async Task<ActionResult<List<ProjectGroupDto>>> GetAll()
    {
        var result = await _getAllHandler.Handle(new GetAllProjectGroupsQuery());
        return Ok(result);
    }

    // POST /api/project-groups
    [HttpPost]
    public async Task<ActionResult<ProjectGroupDto>> Create([FromBody] CreateProjectGroupRequest request)
    {
        try
        {
            // Inject caller's username if not already set
            if (string.IsNullOrEmpty(request.CreatedBy))
                request.CreatedBy = User.Identity?.Name ?? string.Empty;

            var command = new CreateProjectGroupCommand { Request = request };
            var result  = await _createHandler.Handle(command);
            return CreatedAtAction(nameof(GetAll), new { }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/project-groups/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ProjectGroupDto>> Update(string id, [FromBody] UpdateProjectGroupRequest request)
    {
        var command = new UpdateProjectGroupCommand { Id = id, Request = request };
        var result  = await _updateHandler.Handle(command);

        if (result == null) return NotFound();
        return Ok(result);
    }

    // DELETE /api/project-groups/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await _deleteHandler.Handle(new DeleteProjectGroupCommand { Id = id });
        if (!deleted) return NotFound();
        return NoContent();
    }

    // POST /api/project-groups/{id}/projects/{projectId}
    [HttpPost("{id}/projects/{projectId}")]
    public async Task<ActionResult<ProjectGroupDto>> AddProject(string id, string projectId)
    {
        var command = new AddProjectToGroupCommand { GroupId = id, ProjectId = projectId };
        var result  = await _addProjectHandler.Handle(command);

        if (result == null) return NotFound();
        return Ok(result);
    }

    // DELETE /api/project-groups/{id}/projects/{projectId}
    [HttpDelete("{id}/projects/{projectId}")]
    public async Task<ActionResult<ProjectGroupDto>> RemoveProject(string id, string projectId)
    {
        var command = new RemoveProjectFromGroupCommand { GroupId = id, ProjectId = projectId };
        var result  = await _removeProjectHandler.Handle(command);

        if (result == null) return NotFound();
        return Ok(result);
    }
}