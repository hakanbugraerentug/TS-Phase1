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

    public async Task<List<User>> GetAllAsync()
    {
        return await _context.Users.Find(_ => true).ToListAsync();
    }

    public async Task<List<User>> SearchAsync(string searchTerm, int limit)
    {
        var escaped = System.Text.RegularExpressions.Regex.Escape(searchTerm);

        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Regex(u => u.Username,
                new MongoDB.Bson.BsonRegularExpression(escaped, "i")),
            Builders<User>.Filter.Regex(u => u.FullName,
                new MongoDB.Bson.BsonRegularExpression(escaped, "i"))
        );

        return await _context.Users
            .Find(filter)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<List<string>> GetSubordinatesAsync(string username)
    {
        var user = await GetByUsernameAsync(username);
        if (user == null) return new List<string>();

        var allUsers = await _context.Users.Find(_ => true).ToListAsync();
        var byManager = allUsers
            .Where(u => !string.IsNullOrEmpty(u.Manager))
            .GroupBy(u => u.Manager)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<string>();
        var visited = new HashSet<string>();
        var queue = new Queue<string>();
        queue.Enqueue(user.DistinguishedName);

        while (queue.Count > 0)
        {
            var dn = queue.Dequeue();
            if (!visited.Add(dn)) continue;

            if (byManager.TryGetValue(dn, out var directReports))
            {
                foreach (var report in directReports)
                {
                    result.Add(report.Username);
                    queue.Enqueue(report.DistinguishedName);
                }
            }
        }

        return result;
    }

    public async Task<object?> GetOrgChartAsync(string username)
    {
        var activeUser = await _context.Users.Find(u => u.Username == username).FirstOrDefaultAsync();
        if (activeUser == null) return null;

        async Task<TeamSync.Application.DTOs.OrgChartDto?> BuildManagerChain(string? managerDn, int depth)
        {
            if (string.IsNullOrEmpty(managerDn) || depth > 5) return null;
            var mgr = await _context.Users.Find(u => u.DistinguishedName == managerDn).FirstOrDefaultAsync();
            if (mgr == null) return null;

            return new TeamSync.Application.DTOs.OrgChartDto
            {
                Username = mgr.Username,
                FullName = mgr.FullName,
                Title = mgr.Title,
                Sector = mgr.Sector,
                Directorate = mgr.Directorate,
                Department = mgr.Department,
                DistinguishedName = mgr.DistinguishedName,
                IsActiveUser = false,
                Manager = await BuildManagerChain(mgr.Manager, depth + 1),
                Siblings = new List<TeamSync.Application.DTOs.OrgChartDto>()
            };
        }

        var siblings = string.IsNullOrEmpty(activeUser.Manager)
            ? new List<TeamSync.Domain.Entities.User>()
            : await _context.Users
                .Find(u => u.Manager == activeUser.Manager && u.Username != username)
                .ToListAsync();

        var managerChain = await BuildManagerChain(activeUser.Manager, 0);

        return new TeamSync.Application.DTOs.OrgChartDto
        {
            Username = activeUser.Username,
            FullName = activeUser.FullName,
            Title = activeUser.Title,
            Sector = activeUser.Sector,
            Directorate = activeUser.Directorate,
            Department = activeUser.Department,
            DistinguishedName = activeUser.DistinguishedName,
            IsActiveUser = true,
            Manager = managerChain,
            Siblings = siblings.Select(s => new TeamSync.Application.DTOs.OrgChartDto
            {
                Username = s.Username,
                FullName = s.FullName,
                Title = s.Title,
                Sector = s.Sector,
                Directorate = s.Directorate,
                Department = s.Department,
                DistinguishedName = s.DistinguishedName,
                IsActiveUser = false,
                Manager = null,
                Siblings = new List<TeamSync.Application.DTOs.OrgChartDto>()
            }).ToList()
        };
    }
}