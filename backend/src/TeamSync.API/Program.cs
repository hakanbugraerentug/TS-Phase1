using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using TeamSync.Application.Interfaces;
using TeamSync.Application.Services;
using TeamSync.Application.CQRS.Project.Commands.CreateProject;
using TeamSync.Application.CQRS.Project.Commands.UpdateProject;
using TeamSync.Application.CQRS.Project.Commands.DeleteProject;
using TeamSync.Application.CQRS.Project.Queries.GetAllProjects;
using TeamSync.Application.CQRS.Project.Queries.GetProjectById;
using TeamSync.Application.CQRS.Project.Queries.GetProjectsByOwner;
using TeamSync.Application.CQRS.Comment.Commands.AddComment;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByDate;
using TeamSync.Application.CQRS.Comment.Queries.GetCommentsByProject;
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

// Register services - Infrastructure Layer
builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped<ILdapService, LdapService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();

// Register services - Application Layer
builder.Services.AddScoped<IAuthService, AuthService>();

// Register CQRS Handlers
builder.Services.AddScoped<CreateProjectCommandHandler>();
builder.Services.AddScoped<UpdateProjectCommandHandler>();
builder.Services.AddScoped<DeleteProjectCommandHandler>();
builder.Services.AddScoped<GetAllProjectsQueryHandler>();
builder.Services.AddScoped<GetProjectByIdQueryHandler>();
builder.Services.AddScoped<GetProjectsByOwnerQueryHandler>();

// Register CQRS Comment Handlers
builder.Services.AddScoped<AddCommentCommandHandler>();
builder.Services.AddScoped<GetCommentsByDateQueryHandler>();
builder.Services.AddScoped<GetCommentsByProjectQueryHandler>();

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
builder.Services.AddSwaggerGen();

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
