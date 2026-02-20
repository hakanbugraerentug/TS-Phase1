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
}
