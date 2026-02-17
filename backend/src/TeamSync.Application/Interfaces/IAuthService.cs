using TeamSync.Application.DTOs;

namespace TeamSync.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}
