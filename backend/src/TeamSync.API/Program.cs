using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TeamSync.Application.Interfaces;
using TeamSync.Application.Services;
using TeamSync.Application.CQRS.Project.Commands.CreateProject;
using TeamSync.Application.CQRS.Project.Commands.UpdateProject;
using TeamSync.Application.CQRS.Project.Commands.UpdateProjectDetails;
using TeamSync.Application.CQRS.Project.Commands.DeleteProject;
using TeamSync.Application.CQRS.Project.Queries.GetAllProjects;
using TeamSync.Application.CQRS.Project.Queries.GetProjectById;
using TeamSync.Application.CQRS.Project.Queries.GetProjectsByOwner;
using TeamSync.Application.CQRS.Comment.Commands.AddComment;
using TeamSync.Application.CQRS.Comment.Commands.DeleteComment;
using TeamSync.Application.CQRS.Comment.Queries.GetAllComments;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByDate;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByProject;
using TeamSync.Application.CQRS.Team.Commands.CreateTeam;
using TeamSync.Application.CQRS.Team.Commands.SetLeader;
using TeamSync.Application.CQRS.Team.Commands.AddMember;
using TeamSync.Application.CQRS.Team.Commands.RemoveMember;
using TeamSync.Application.CQRS.Team.Queries.GetAllTeams;
using TeamSync.Application.CQRS.Team.Queries.GetTeamById;
using TeamSync.Application.CQRS.Team.Queries.GetTeamsByProject;
using TeamSync.Application.CQRS.Team.Queries.GetMyTeams;
using TeamSync.Domain.Interfaces;
using TeamSync.Persistency.Context;
using TeamSync.Persistency.Repositories;
using TeamSync.Persistency.Services;
using TeamSync.Persistency.Settings;

var builder = WebApplication.CreateBuilder(args);

// Configure settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<LdapSettings>(builder.Configuration.GetSection("LdapSettings"));
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDbSettings"));
builder.Services.Configure<VlmSettings>(builder.Configuration.GetSection("VlmSettings"));
builder.Services.Configure<LlmSettings>(builder.Configuration.GetSection("LlmSettings"));

// Register services - Infrastructure Layer
builder.Services.AddHttpClient();

static HttpClientHandler CreateHandlerWithCaCert(string caCertPath, ILogger logger)
{
    var handler = new HttpClientHandler();
    if (!string.IsNullOrEmpty(caCertPath) && File.Exists(caCertPath))
    {
        try
        {
            var caCert = new X509Certificate2(caCertPath);
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) =>
            {
                if (errors == SslPolicyErrors.None) return true;
                chain!.ChainPolicy.ExtraStore.Add(caCert);
                chain.ChainPolicy.VerificationFlags = X509VerificationFlags.AllowUnknownCertificateAuthority;
                return chain.Build(cert!);
            };
        }
        catch (Exception ex)
        {
            logger.LogError("Failed to load CA certificate from '{Path}': {Message}", caCertPath, ex.Message);
        }
    }
    return handler;
}

// Register named HttpClient for VLM with optional custom CA certificate
var vlmConfig = builder.Configuration.GetSection("VlmSettings").Get<VlmSettings>() ?? new VlmSettings();
builder.Services.AddHttpClient("VlmClient")
    .ConfigurePrimaryHttpMessageHandler(sp => CreateHandlerWithCaCert(
        vlmConfig.CaCertPath,
        sp.GetRequiredService<ILoggerFactory>().CreateLogger("VlmClient")));

// Register named HttpClient for LLM with optional custom CA certificate
var llmConfig = builder.Configuration.GetSection("LlmSettings").Get<LlmSettings>() ?? new LlmSettings();
builder.Services.AddHttpClient("LlmClient")
    .ConfigurePrimaryHttpMessageHandler(sp => CreateHandlerWithCaCert(
        llmConfig.CaCertPath,
        sp.GetRequiredService<ILoggerFactory>().CreateLogger("LlmClient")));

builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped<ILdapService, LdapService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<IVlmImageService, VlmImageService>();
builder.Services.AddScoped<IPlaceholderImageService, PlaceholderImageService>();
builder.Services.AddScoped<IWeeklyReportRepository, WeeklyReportRepository>();

// Register services - Application Layer
builder.Services.AddScoped<IAuthService, AuthService>();

// Register CQRS Handlers
builder.Services.AddScoped<CreateProjectCommandHandler>();
builder.Services.AddScoped<UpdateProjectCommandHandler>();
builder.Services.AddScoped<UpdateProjectDetailsCommandHandler>();
builder.Services.AddScoped<DeleteProjectCommandHandler>();
builder.Services.AddScoped<GetAllProjectsQueryHandler>();
builder.Services.AddScoped<GetProjectByIdQueryHandler>();
builder.Services.AddScoped<GetProjectsByOwnerQueryHandler>();

// Register CQRS Comment Handlers
builder.Services.AddScoped<AddCommentCommandHandler>();
builder.Services.AddScoped<DeleteCommentCommandHandler>();
builder.Services.AddScoped<GetAllCommentsQueryHandler>();
builder.Services.AddScoped<GetCommentsByDateQueryHandler>();
builder.Services.AddScoped<GetCommentsByProjectQueryHandler>();

// Register CQRS Team Handlers
builder.Services.AddScoped<CreateTeamCommandHandler>();
builder.Services.AddScoped<SetLeaderCommandHandler>();
builder.Services.AddScoped<AddMemberCommandHandler>();
builder.Services.AddScoped<RemoveMemberCommandHandler>();
builder.Services.AddScoped<GetAllTeamsQueryHandler>();
builder.Services.AddScoped<GetTeamByIdQueryHandler>();
builder.Services.AddScoped<GetTeamsByProjectQueryHandler>();
builder.Services.AddScoped<GetMyTeamsQueryHandler>();

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();
if (jwtSettings != null)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
            };
        });
}

builder.Services.AddAuthorization();

// Add CORS
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add controllers
builder.Services.AddControllers();

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token giriniz. Örnek: Bearer {token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS must be before authentication/authorization
app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
