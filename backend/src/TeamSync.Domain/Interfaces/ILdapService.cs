using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface ILdapService
{
    Task<User?> AuthenticateAsync(string username, string password);
}
