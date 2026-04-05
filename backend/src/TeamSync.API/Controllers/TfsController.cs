using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Domain.Interfaces;

namespace TeamSync.API.Controllers;

public record SaveTfsCredentialsRequest(string BaseUrl, string Pat);

public record TfsCredentialsStatusResponse(bool HasCredentials, string? BaseUrl);

public record TfsCommitDto(
    string CommitId,
    string Comment,
    string AuthorName,
    DateTime AuthorDate,
    string RepositoryName,
    string ProjectName,
    string RemoteUrl
);

public record TfsWorkItemDto(
    int Id,
    string Title,
    string State,
    string WorkItemType,
    string? AssignedTo,
    DateTime ChangedDate,
    string Url
);

[ApiController]
[Route("api/tfs")]
[Authorize]
public class TfsController : ControllerBase
{
    private readonly IAccessTokenRepository _accessTokenRepo;
    private readonly ITfsService _tfsService;

    public TfsController(IAccessTokenRepository accessTokenRepo, ITfsService tfsService)
    {
        _accessTokenRepo = accessTokenRepo;
        _tfsService = tfsService;
    }

    /// <summary>
    /// Saves (or updates) the Azure DevOps BASE_URL and PAT for the current user.
    /// The PAT is encrypted with AES-256 before being stored.
    /// </summary>
    [HttpPost("credentials")]
    public async Task<IActionResult> SaveCredentials([FromBody] SaveTfsCredentialsRequest request)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.BaseUrl))
            return BadRequest(new { message = "baseUrl is required." });

        if (string.IsNullOrWhiteSpace(request.Pat))
            return BadRequest(new { message = "pat is required." });

        await _accessTokenRepo.UpsertAsync(username, request.BaseUrl.TrimEnd('/'), request.Pat);
        return Ok(new { message = "TFS credentials saved successfully." });
    }

    /// <summary>
    /// Returns whether the current user has stored TFS credentials (without exposing the PAT).
    /// </summary>
    [HttpGet("credentials/status")]
    public async Task<ActionResult<TfsCredentialsStatusResponse>> GetCredentialsStatus()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var record = await _accessTokenRepo.GetByUsernameAsync(username);
        if (record == null)
            return Ok(new TfsCredentialsStatusResponse(false, null));

        return Ok(new TfsCredentialsStatusResponse(true, record.BaseUrl));
    }

    /// <summary>
    /// Returns the current user's commits from the last 7 days across all repositories.
    /// </summary>
    [HttpGet("commits")]
    public async Task<ActionResult<List<TfsCommitDto>>> GetMyCommits()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        try
        {
            var commits = await _tfsService.GetMyRecentCommitsAsync(username);
            var dtos = commits.Select(c => new TfsCommitDto(
                c.CommitId, c.Comment, c.AuthorName, c.AuthorDate,
                c.RepositoryName, c.ProjectName, c.RemoteUrl)).ToList();
            return Ok(dtos);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Returns work items assigned to the current user that were completed in the last 7 days.
    /// </summary>
    [HttpGet("workitems/completed")]
    public async Task<ActionResult<List<TfsWorkItemDto>>> GetCompletedWorkItems()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        try
        {
            var items = await _tfsService.GetMyCompletedWorkItemsLastWeekAsync(username);
            return Ok(items.Select(ToDto).ToList());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Returns work items currently assigned to and active for the current user.
    /// </summary>
    [HttpGet("workitems/active")]
    public async Task<ActionResult<List<TfsWorkItemDto>>> GetActiveWorkItems()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        try
        {
            var items = await _tfsService.GetMyActiveWorkItemsAsync(username);
            return Ok(items.Select(ToDto).ToList());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static TfsWorkItemDto ToDto(TfsWorkItemInfo wi) => new(
        wi.Id, wi.Title, wi.State, wi.WorkItemType, wi.AssignedTo, wi.ChangedDate, wi.Url);
}
