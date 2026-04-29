using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamSync.Domain.Interfaces;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    /// <summary>
    /// Kullanıcıları döndürür. search parametresi varsa filtreler (min 2 karakter).
    /// search yoksa tüm kullanıcıları döndürür (eski davranış).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] int limit = 20)
    {
        if (!string.IsNullOrWhiteSpace(search) && search.Length >= 2)
        {
            var filtered = await _userRepository.SearchAsync(search, Math.Min(limit, 50));
            return Ok(filtered.Select(u => new
            {
                username = u.Username,
                fullName = u.FullName
            }));
        }

        var users = await _userRepository.GetAllAsync();
        return Ok(users);
    }

    /// <summary>
    /// Kullanıcının fotoğrafını PNG olarak döndürür.
    /// MongoDB'deki BinData(0, ...) alanı byte[] olarak okunur ve direkt image/png response döner.
    /// </summary>
    [HttpGet("{username}/photo")]
    public async Task<IActionResult> GetUserPhoto(string username)
    {
        var photo = await _userRepository.GetPhotoByUsernameAsync(username);

        if (photo == null || photo.Length == 0)
        {
            return NotFound(new { message = $"Photo not found for user: {username}" });
        }

        return File(photo, "image/png");
    }

    /// <summary>
    /// Kullanıcının organizasyon şeması verilerini döndürür.
    /// Manager zinciri recursive olarak çekilir (max 5 seviye).
    /// Siblings: aynı manager'a sahip diğer kullanıcılar.
    /// </summary>
    [HttpGet("{username}/org-chart")]
    public async Task<IActionResult> GetOrgChart(string username)
    {
        var result = await _userRepository.GetOrgChartAsync(username);
        if (result == null)
            return NotFound(new { message = "Org chart not found" });
        return Ok(result);
    }

    /// <summary>
    /// Tüm kullanıcıları org chart için döner (username, fullName, title, department, sector, directorate, distinguishedName, manager)
    /// </summary>
    [HttpGet("all-org")]
    public async Task<IActionResult> GetAllForOrgChart()
    {
        var users = await _userRepository.GetAllAsync();
        var result = users.Select(u => new
        {
            username = u.Username,
            fullName = u.FullName,
            title = u.Title,
            department = u.Department,
            sector = u.Sector,
            directorate = u.Directorate,
            distinguishedName = u.DistinguishedName,
            manager = u.Manager
        });
        return Ok(result);
    }
}