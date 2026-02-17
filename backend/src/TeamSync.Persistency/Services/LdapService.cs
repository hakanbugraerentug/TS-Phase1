using System.DirectoryServices.Protocols;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Settings;

namespace TeamSync.Persistency.Services;

public class LdapService : ILdapService
{
    private readonly LdapSettings _settings;
    private readonly ILogger<LdapService> _logger;

    public LdapService(IOptions<LdapSettings> settings, ILogger<LdapService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<User?> AuthenticateAsync(string username, string password)
    {
        return await Task.Run(() =>
        {
            try
            {
                var identifier = new LdapDirectoryIdentifier(_settings.Server, _settings.Port);
                var credentials = new NetworkCredential($"{_settings.Domain}\\{username}", password);

                using var connection = new LdapConnection(identifier);
                connection.AuthType = AuthType.Basic;
                connection.Credential = credentials;

                // Attempt to bind - this authenticates the user
                connection.Bind();

                _logger.LogInformation("LDAP authentication successful for user: {Username}", username);

                // If successful, search for user details
                var searchRequest = new SearchRequest(
                    _settings.BaseDn,
                    $"(sAMAccountName={username})",
                    SearchScope.Subtree,
                    new[] { "displayName", "sAMAccountName", "employeeID" }
                );

                var searchResponse = (SearchResponse)connection.SendRequest(searchRequest);

                if (searchResponse.Entries.Count > 0)
                {
                    var entry = searchResponse.Entries[0];
                    
                    var fullName = entry.Attributes.Contains("displayName") 
                        ? entry.Attributes["displayName"][0]?.ToString() ?? username
                        : username;

                    var employeeId = entry.Attributes.Contains("employeeID") 
                        ? entry.Attributes["employeeID"][0]?.ToString() ?? "N/A"
                        : "N/A";

                    return new User
                    {
                        Username = username,
                        FullName = fullName,
                        EmployeeId = employeeId
                    };
                }

                _logger.LogWarning("LDAP user not found in directory: {Username}", username);
                return null;
            }
            catch (LdapException ex)
            {
                _logger.LogWarning("LDAP authentication failed for user {Username}: {Error}", username, ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during LDAP authentication for user {Username}", username);
                return null;
            }
        });
    }
}
