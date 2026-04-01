using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;

namespace TeamSync.API.Controllers;

public record CreateDelegationRequest(string DelegateUsername, string DurationType);

public record DelegationDto(
    string Id,
    string DelegatorUsername,
    string DelegateUsername,
    string DurationType,
    DateTime? ExpiresAt,
    DateTime CreatedAt,
    bool IsActive
);

[ApiController]
[Route("api/delegations")]
[Authorize]
public class DelegationsController : ControllerBase
{
    private readonly IDelegationRepository _repo;

    public DelegationsController(IDelegationRepository repo)
    {
        _repo = repo;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDelegationRequest request)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        if (string.IsNullOrEmpty(request.DelegateUsername))
            return BadRequest("delegateUsername is required.");

        if (request.DelegateUsername == username)
            return BadRequest("You cannot delegate to yourself.");

        DateTime? expiresAt;
        if (request.DurationType == "1_gun")
            expiresAt = DateTime.UtcNow.AddDays(1);
        else if (request.DurationType == "1_hafta")
            expiresAt = DateTime.UtcNow.AddDays(7);
        else if (request.DurationType == "suresiz")
            expiresAt = null;
        else
            return BadRequest("Invalid durationType. Must be '1_gun', '1_hafta', or 'suresiz'.");

        var delegation = new Delegation
        {
            DelegatorUsername = username,
            DelegateUsername = request.DelegateUsername,
            DurationType = request.DurationType,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        var created = await _repo.CreateAsync(delegation);
        return Ok(ToDto(created));
    }

    [HttpGet("by-me")]
    public async Task<IActionResult> GetByMe()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var delegations = await _repo.GetByDelegatorAsync(username);
        return Ok(delegations.Select(ToDto));
    }

    [HttpGet("to-me")]
    public async Task<IActionResult> GetToMe()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var delegations = await _repo.GetActiveDelegationsForDelegateAsync(username);
        return Ok(delegations.Select(ToDto));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Revoke(string id)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var revoked = await _repo.RevokeAsync(id, username);
        if (!revoked)
            return NotFound("Delegation not found or you are not the delegator.");

        return Ok(new { message = "Delegation revoked." });
    }

    private static DelegationDto ToDto(Delegation d) => new(
        d.Id ?? string.Empty,
        d.DelegatorUsername,
        d.DelegateUsername,
        d.DurationType,
        d.ExpiresAt,
        d.CreatedAt,
        d.IsActive
    );
}
