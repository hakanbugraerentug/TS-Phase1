using TeamSync.Application.DTOs;
using TeamSync.Application.Interfaces;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Application.Services;

public class AuthService : IAuthService
{
    private readonly ILdapService _ldapService;
    private readonly ITokenService _tokenService;

    public AuthService(ILdapService ldapService, ITokenService tokenService)
    {
        _ldapService = ldapService;
        _tokenService = tokenService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        // Authenticate against LDAP
        var user = await _ldapService.AuthenticateAsync(request.Username, request.Password);

        if (user == null)
        {
            return null;
        }

        // Generate JWT token
        var token = _tokenService.GenerateToken(user);

        // Return response in the format expected by frontend
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
