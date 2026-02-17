using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;

namespace TeamSync.Persistency.Repositories;

public class UserRepository : IUserRepository
{
    private readonly MongoDbContext _context;

    public UserRepository(MongoDbContext context)
    {
        _context = context;
    }

    public Task<User?> GetByUsernameAsync(string username)
    {
        // MongoDB implementation can be added later
        return Task.FromResult<User?>(null);
    }

    public Task<User> CreateAsync(User user)
    {
        // MongoDB implementation can be added later
        return Task.FromResult(user);
    }

    public Task<User> UpdateAsync(User user)
    {
        // MongoDB implementation can be added later
        return Task.FromResult(user);
    }
}
