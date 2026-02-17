using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user);
}
