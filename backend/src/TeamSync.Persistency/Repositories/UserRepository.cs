using MongoDB.Driver;
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

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _context.Users
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
    }

    public async Task<byte[]?> GetPhotoByUsernameAsync(string username)
    {
        var user = await _context.Users
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
        return user?.Photo;
    }

    public async Task<User> CreateAsync(User user)
    {
        await _context.Users.InsertOneAsync(user);
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        await _context.Users.ReplaceOneAsync(u => u.Username == user.Username, user);
        return user;
    }
}
