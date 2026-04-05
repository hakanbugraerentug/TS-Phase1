using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using TeamSync.Domain.Interfaces;

namespace TeamSync.Persistency.Services;

/// <summary>
/// Calls Azure DevOps / TFS REST APIs to retrieve commits and work items for the authenticated user.
/// </summary>
public class TfsService : ITfsService
{
    private readonly IAccessTokenRepository _tokenRepository;
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private const int MaxProjectsPerPage = 200;
    private const int MaxCommitsPerRepo = 100;
    private const int MaxWorkItemsPerQuery = 50;

    public TfsService(IAccessTokenRepository tokenRepository, IHttpClientFactory httpClientFactory)
    {
        _tokenRepository = tokenRepository;
        _httpClientFactory = httpClientFactory;
    }

    // -------------------------------------------------------------------------
    // Public interface methods
    // -------------------------------------------------------------------------

    public async Task<List<TfsCommitInfo>> GetMyRecentCommitsAsync(string username)
    {
        var (client, baseUrl) = await CreateClientAsync(username);

        var fromDate = DateTime.UtcNow.AddDays(-7).ToString("o");
        var commits = new List<TfsCommitInfo>();

        // Fetch the authenticated user's display name and unique name (email/alias) from Azure DevOps
        // so we can filter commits client-side rather than relying on the username matching the git author field.
        var userInfo = await GetAuthenticatedUserInfoAsync(client, baseUrl);

        // Enumerate all projects then all git repositories within each project
        var projects = await GetProjectsAsync(client, baseUrl);
        foreach (var project in projects)
        {
            var repos = await GetRepositoriesAsync(client, baseUrl, project.Name);
            foreach (var repo in repos)
            {
                var repoCommits = await GetCommitsForRepoAsync(
                    client, baseUrl, project.Name, repo.Id, repo.Name, fromDate);
                commits.AddRange(repoCommits);
            }
        }

        // Filter client-side: keep commits whose author name or email matches the authenticated user.
        var filtered = commits.Where(c =>
            (!string.IsNullOrEmpty(userInfo.DisplayName) &&
             c.AuthorName.Equals(userInfo.DisplayName, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrEmpty(userInfo.UniqueName) &&
             c.AuthorEmail.Equals(userInfo.UniqueName, StringComparison.OrdinalIgnoreCase)));

        return filtered.OrderByDescending(c => c.AuthorDate).ToList();
    }

    public async Task<List<TfsWorkItemInfo>> GetMyCompletedWorkItemsLastWeekAsync(string username)
    {
        var (client, baseUrl) = await CreateClientAsync(username);

        var fromDate = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
        // WIQL: work items assigned to @Me that were closed/resolved in the last 7 days
        var wiql = $@"SELECT [System.Id] FROM WorkItems
                      WHERE [System.AssignedTo] = @Me
                        AND [System.State] IN ('Closed', 'Resolved', 'Done', 'Completed')
                        AND [System.ChangedDate] >= '{fromDate}'
                      ORDER BY [System.ChangedDate] DESC";

        return await QueryWorkItemsAsync(client, baseUrl, wiql);
    }

    public async Task<List<TfsWorkItemInfo>> GetMyActiveWorkItemsAsync(string username)
    {
        var (client, baseUrl) = await CreateClientAsync(username);

        // WIQL: active work items assigned to @Me
        const string wiql = @"SELECT [System.Id] FROM WorkItems
                               WHERE [System.AssignedTo] = @Me
                                 AND [System.State] IN ('Active', 'In Progress', 'Committed', 'Open', 'New', 'Doing', 'To Do')
                                 AND [System.WorkItemType] <> 'Test Suite'
                                 AND [System.WorkItemType] <> 'Test Plan'
                               ORDER BY [System.ChangedDate] DESC";

        return await QueryWorkItemsAsync(client, baseUrl, wiql);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<(HttpClient client, string baseUrl)> CreateClientAsync(string username)
    {
        var credentials = await _tokenRepository.GetDecryptedCredentialsAsync(username)
            ?? throw new InvalidOperationException("TFS credentials not found. Please configure them first.");

        var client = _httpClientFactory.CreateClient();
        // Azure DevOps PAT authentication: Basic auth with empty username and PAT as password
        var basicCredentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{credentials.PlainPat}"));
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", basicCredentials);
        client.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        var baseUrl = credentials.BaseUrl.TrimEnd('/');
        return (client, baseUrl);
    }

    private async Task<List<AzureProject>> GetProjectsAsync(HttpClient client, string baseUrl)
    {
        var url = $"{baseUrl}/_apis/projects?api-version=6.0&$top={MaxProjectsPerPage}";
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return new List<AzureProject>();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AzureListResult<AzureProject>>(json, JsonOptions);
        return result?.Value ?? new List<AzureProject>();
    }

    private async Task<List<AzureRepo>> GetRepositoriesAsync(
        HttpClient client, string baseUrl, string projectName)
    {
        var encodedProject = Uri.EscapeDataString(projectName);
        var url = $"{baseUrl}/{encodedProject}/_apis/git/repositories?api-version=6.0";
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return new List<AzureRepo>();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AzureListResult<AzureRepo>>(json, JsonOptions);
        return result?.Value ?? new List<AzureRepo>();
    }

    private async Task<List<TfsCommitInfo>> GetCommitsForRepoAsync(
        HttpClient client,
        string baseUrl,
        string projectName,
        string repoId,
        string repoName,
        string fromDateIso)
    {
        var encodedProject = Uri.EscapeDataString(projectName);
        var url = $"{baseUrl}/{encodedProject}/_apis/git/repositories/{repoId}/commits" +
                  $"?searchCriteria.fromDate={Uri.EscapeDataString(fromDateIso)}" +
                  $"&$top={MaxCommitsPerRepo}&api-version=6.0";

        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return new List<TfsCommitInfo>();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AzureListResult<AzureCommit>>(json, JsonOptions);

        return (result?.Value ?? new List<AzureCommit>())
            .Select(c => new TfsCommitInfo(
                CommitId: c.CommitId,
                Comment: c.Comment,
                AuthorName: c.Author?.Name ?? string.Empty,
                AuthorEmail: c.Author?.Email ?? string.Empty,
                AuthorDate: c.Author?.Date ?? DateTime.MinValue,
                RepositoryName: repoName,
                ProjectName: projectName,
                RemoteUrl: c.RemoteUrl ?? string.Empty))
            .ToList();
    }

    private async Task<AzureUserInfo> GetAuthenticatedUserInfoAsync(HttpClient client, string baseUrl)
    {
        // connectionData returns the currently authenticated user's display name and unique name (email/alias).
        var url = $"{baseUrl}/_apis/connectionData?api-version=6.0";
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return new AzureUserInfo(string.Empty, string.Empty);

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<AzureConnectionData>(json, JsonOptions);
        var user = data?.AuthenticatedUser;
        return new AzureUserInfo(
            DisplayName: user?.ProviderDisplayName ?? string.Empty,
            UniqueName: user?.Properties?.Account?.Value ?? string.Empty);
    }

    private async Task<List<TfsWorkItemInfo>> QueryWorkItemsAsync(
        HttpClient client, string baseUrl, string wiql)
    {
        // Step 1: run WIQL to get IDs
        var wiqlUrl = $"{baseUrl}/_apis/wit/wiql?api-version=6.0";
        var wiqlBody = JsonSerializer.Serialize(new { query = wiql });
        var wiqlContent = new StringContent(wiqlBody, Encoding.UTF8, "application/json");
        var wiqlResponse = await client.PostAsync(wiqlUrl, wiqlContent);
        if (!wiqlResponse.IsSuccessStatusCode)
            return new List<TfsWorkItemInfo>();

        var wiqlJson = await wiqlResponse.Content.ReadAsStringAsync();
        var wiqlResult = JsonSerializer.Deserialize<WiqlResult>(wiqlJson, JsonOptions);
        var ids = wiqlResult?.WorkItems?.Select(w => w.Id).Take(MaxWorkItemsPerQuery).ToList() ?? new List<int>();
        if (ids.Count == 0)
            return new List<TfsWorkItemInfo>();

        // Step 2: batch-fetch work item details
        var idsParam = string.Join(",", ids);
        var fields = "System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.ChangedDate";
        var detailUrl = $"{baseUrl}/_apis/wit/workitems?ids={idsParam}&fields={fields}&api-version=6.0";
        var detailResponse = await client.GetAsync(detailUrl);
        if (!detailResponse.IsSuccessStatusCode)
            return new List<TfsWorkItemInfo>();

        var detailJson = await detailResponse.Content.ReadAsStringAsync();
        var detailResult = JsonSerializer.Deserialize<AzureListResult<AzureWorkItem>>(detailJson, JsonOptions);

        return (detailResult?.Value ?? new List<AzureWorkItem>())
            .Select(wi =>
            {
                var f = wi.Fields;
                return new TfsWorkItemInfo(
                    Id: f.SystemId,
                    Title: f.SystemTitle ?? string.Empty,
                    State: f.SystemState ?? string.Empty,
                    WorkItemType: f.SystemWorkItemType ?? string.Empty,
                    AssignedTo: f.SystemAssignedTo?.DisplayName,
                    ChangedDate: f.SystemChangedDate ?? DateTime.MinValue,
                    Url: wi.Url ?? string.Empty);
            })
            .ToList();
    }

    // -------------------------------------------------------------------------
    // Private response models (Azure DevOps REST API shapes)
    // -------------------------------------------------------------------------

    private record AzureListResult<T>(List<T> Value, int Count);

    private record AzureProject(string Id, string Name);

    private record AzureRepo(string Id, string Name);

    private record AzureCommitAuthor(string? Name, string? Email, DateTime Date);

    private record AzureCommit(string CommitId, string Comment, AzureCommitAuthor? Author, string? RemoteUrl);

    private record AzureUserInfo(string DisplayName, string UniqueName);

    private class AzureAccountProperty
    {
        [JsonPropertyName("$value")]
        public string? Value { get; init; }
    }

    private class AzureUserProperties
    {
        [JsonPropertyName("Account")]
        public AzureAccountProperty? Account { get; init; }
    }

    private class AzureAuthenticatedUser
    {
        [JsonPropertyName("providerDisplayName")]
        public string? ProviderDisplayName { get; init; }

        [JsonPropertyName("properties")]
        public AzureUserProperties? Properties { get; init; }
    }

    private class AzureConnectionData
    {
        [JsonPropertyName("authenticatedUser")]
        public AzureAuthenticatedUser? AuthenticatedUser { get; init; }
    }

    private record WiqlWorkItemRef(int Id);

    private record WiqlResult(List<WiqlWorkItemRef>? WorkItems);

    private class AssignedToField
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; init; }
    }

    private class WorkItemFields
    {
        [JsonPropertyName("System.Id")]
        public int SystemId { get; init; }

        [JsonPropertyName("System.Title")]
        public string? SystemTitle { get; init; }

        [JsonPropertyName("System.State")]
        public string? SystemState { get; init; }

        [JsonPropertyName("System.WorkItemType")]
        public string? SystemWorkItemType { get; init; }

        [JsonPropertyName("System.AssignedTo")]
        public AssignedToField? SystemAssignedTo { get; init; }

        [JsonPropertyName("System.ChangedDate")]
        public DateTime? SystemChangedDate { get; init; }
    }

    private record AzureWorkItem(int Id, WorkItemFields Fields, string? Url);
}
