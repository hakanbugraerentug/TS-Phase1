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
        // Admin bypass for testing
        if (request.Username == "admin" && request.Password == "admin")
        {
            var adminUser = new Domain.Entities.User
            {
                Username = "admin",
                FullName = "Administrator",
                EmployeeId = "ADMIN-001"
            };
            var adminToken = _tokenService.GenerateToken(adminUser);
            return new LoginResponse
            {
                AccessToken = adminToken,
                User = new UserInfo
                {
                    FullName = adminUser.FullName,
                    Username = adminUser.Username,
                    EmployeeId = adminUser.EmployeeId
                }
            };
        }

        // MongoDB'de username'e göre kullanıcıyı bul (şifre kontrolü YOK)
        var user = await _userRepository.GetByUsernameAsync(request.Username);

        if (user == null)
        {
            return null; // 401 — kullanıcı bulunamadı
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
                EmployeeId = user.EmployeeId
            }
        };
    }
}
