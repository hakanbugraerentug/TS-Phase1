using TeamSync.Application.DTOs;
using TeamSync.Application.Interfaces;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;

    public AuthService(IUserRepository userRepository, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByUsernameAsync(request.Username);

        // Eğer user bulunamazsa, giriş yapılamaz
        if (user == null)
        {
            return null;
        }

        // JWT üret
        var token = _tokenService.GenerateToken(user);

        return new LoginResponse
        {
            AccessToken = token,
            User = new UserInfo
            {
                FullName = user.FullName,
                Username = user.Username,
                EmployeeId = string.Empty,
                Title = user.Title,
                Department = user.Department,
                Mail = user.Mail
            }
        };
    }
}
