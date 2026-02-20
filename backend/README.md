# TeamSync Backend

.NET 8 backend application built with **DDD (Domain-Driven Design)** and **Clean Architecture** principles.

## Architecture

The solution follows Clean Architecture with four main layers:

### 1. TeamSync.Domain (Domain Layer)
- **No dependencies** on other projects
- Contains:
  - Entities: `User`, `Project`, `Team`, `Comment`
  - Interfaces: `IUserRepository`, `IProjectRepository`, `ITeamRepository`, `ICommentRepository`, `ITokenService`

### 2. TeamSync.Application (Application Layer)
- **Depends on**: Domain
- Contains:
  - DTOs: `LoginRequest`, `LoginResponse`, `ProjectDto`, `TeamDto`, `CommentDto`
  - Services: `AuthService`
  - CQRS Handlers for Projects, Teams, and Comments

### 3. TeamSync.Persistency (Infrastructure Layer)
- **Depends on**: Domain, Application
- Contains:
  - Services: `TokenService`
  - Repositories: `UserRepository`, `ProjectRepository`, `TeamRepository`, `CommentRepository`
  - Context: `MongoDbContext`
  - Settings: `JwtSettings`, `MongoDbSettings`

### 4. TeamSync.API (Presentation Layer)
- **Depends on**: Application, Persistency
- Contains:
  - Controllers: `AuthController`, `ProjectsController`, `TeamsController`, `CommentsController`
  - Configuration: DI, CORS, JWT Authentication, Swagger

## Prerequisites

- .NET 8 SDK or later
- MongoDB running on `localhost:27017`

## Configuration

Update `appsettings.json` in the TeamSync.API project (or set environment variables):

```json
{
  "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
  "JwtSettings": {
    "SecretKey": "super-secret-key-for-teamsync-development-only-32chars",
    "Issuer": "TeamSync.API",
    "Audience": "TeamSync.Frontend",
    "ExpirationInMinutes": 480
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "TeamSyncDb"
  }
}
```

See `.env.example` for environment variable reference.

## Building the Solution

```bash
cd backend
dotnet build
```

## Running the API

```bash
cd backend/src/TeamSync.API
dotnet run
```

The API will start on `http://localhost:8000` by default.

## Demo Seed Data

To seed a demo user, run the following with `mongosh`:

```bash
mongosh TeamSyncDb seed-demo.js
```

This inserts `hakanerentug` user with `FullName: "Hakan Erentuğ"`.

## API Endpoints

### Authentication

#### POST /auth/login
Authenticates a user. If user doesn't exist in MongoDB, auto-registers (demo mode).

**Request:**
```json
{ "username": "hakanerentug", "password": "anypassword" }
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_token_here",
  "user": { "full_name": "Hakan Erentuğ", "username": "hakanerentug", "employee_id": "" }
}
```

### Projects

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/projects | List all projects |
| GET | /api/projects/{id} | Get project by ID |
| POST | /api/projects | Create new project |
| PUT | /api/projects/{id} | Update project |
| DELETE | /api/projects/{id} | Delete project |

### Teams

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/teams | List all teams |
| GET | /api/teams/my-teams | List teams for authenticated user |
| GET | /api/teams/{id} | Get team by ID |
| POST | /api/teams | Create new team |
| PUT | /api/teams/{id}/leader | Set team leader |
| POST | /api/teams/{id}/members | Add member to team |
| DELETE | /api/teams/{id}/members/{username} | Remove member from team |

### Comments

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/comments | List all comments |
| GET | /api/comments/project/{projectId} | Get comments by project |
| POST | /api/comments | Add new comment |

**Add Comment Request:**
```json
{ "projectId": "...", "text": "Comment text", "author": "User Name" }
```

## Swagger Documentation

When running in Development mode, Swagger UI is available at:
- `http://localhost:8000/swagger`

## Notes

- All endpoints (except `/auth/login`) require a JWT Bearer token.
- JWT tokens are valid for 480 minutes (8 hours) by default.
- CORS is configured to allow origins defined in `AllowedOrigins`.
- Demo mode: any username with any password will be auto-registered on first login.
- Admin bypass: `admin/admin` always works and returns an `Administrator` user.


## Architecture

The solution follows Clean Architecture with four main layers:

### 1. TeamSync.Domain (Domain Layer)
- **No dependencies** on other projects
- Contains:
  - Entities: `User`
  - Interfaces: `ILdapService`, `ITokenService`, `IUserRepository`

### 2. TeamSync.Application (Application Layer)
- **Depends on**: Domain
- Contains:
  - DTOs: `LoginRequest`, `LoginResponse`
  - Services: `AuthService`
  - Interfaces: `IAuthService`

### 3. TeamSync.Persistency (Infrastructure Layer)
- **Depends on**: Domain, Application
- Contains:
  - Services: `LdapService`, `TokenService`
  - Repositories: `UserRepository`
  - Context: `MongoDbContext`
  - Settings: `JwtSettings`, `LdapSettings`, `MongoDbSettings`

### 4. TeamSync.API (Presentation Layer)
- **Depends on**: Application, Persistency
- Contains:
  - Controllers: `AuthController`
  - Configuration: DI, CORS, JWT Authentication, Swagger

## Prerequisites

- .NET 8 SDK or later
- LDAP/Active Directory server (for authentication)
- MongoDB (optional, infrastructure is ready but not actively used yet)

## Configuration

Update `appsettings.json` in the TeamSync.API project:

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  "JwtSettings": {
    "SecretKey": "your-secret-key-min-32-chars",
    "Issuer": "TeamSync.API",
    "Audience": "TeamSync.Frontend",
    "ExpirationInMinutes": 480
  },
  "LdapSettings": {
    "Server": "your-ldap-server.com",
    "Port": 389,
    "BaseDn": "DC=yourdomain,DC=com",
    "Domain": "YOURDOMAIN"
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "TeamSyncDb"
  }
}
```

### Security Best Practices

⚠️ **IMPORTANT**: The JWT secret key in `appsettings.json` is for development only. 

**For production:**
- Store sensitive configuration in environment variables or Azure Key Vault
- Use .NET User Secrets for local development: `dotnet user-secrets set "JwtSettings:SecretKey" "your-production-key"`
- Never commit production secrets to source control
- Restrict CORS origins to specific domains

## Building the Solution

```bash
cd backend
dotnet build
```

## Running the API

```bash
cd backend/src/TeamSync.API
dotnet run
```

The API will start on `http://localhost:8000` by default.

## API Endpoints

### POST /auth/login

Authenticates a user against LDAP and returns a JWT token.

**Request:**
```json
{
  "username": "user123",
  "password": "password"
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_token_here",
  "user": {
    "full_name": "John Doe",
    "username": "user123",
    "employee_id": "EMP-001"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "message": "Invalid credentials"
}
```

## Swagger Documentation

When running in Development mode, Swagger UI is available at:
- `http://localhost:8000/swagger`

## Testing with curl

```bash
# Test login endpoint
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"youruser","password":"yourpass"}'
```

## LDAP Authentication

The backend uses `System.DirectoryServices.Protocols` to authenticate against Active Directory:

1. User credentials are validated against the LDAP server
2. On successful authentication, user details are retrieved from LDAP:
   - `displayName` → `full_name`
   - `sAMAccountName` → `username`
   - `employeeID` → `employee_id`
3. A JWT token is generated and returned

## Project Structure

```
backend/
├── TeamSync.sln
└── src/
    ├── TeamSync.API/
    │   ├── Controllers/
    │   │   └── AuthController.cs
    │   ├── Program.cs
    │   └── appsettings.json
    ├── TeamSync.Application/
    │   ├── DTOs/
    │   ├── Services/
    │   └── Interfaces/
    ├── TeamSync.Domain/
    │   ├── Entities/
    │   └── Interfaces/
    └── TeamSync.Persistency/
        ├── Services/
        ├── Repositories/
        ├── Context/
        └── Settings/
```

## Notes

- CORS is configured to allow specific origins from the `AllowedOrigins` configuration. Update this in production to match your frontend domain.
- JWT tokens are valid for 480 minutes (8 hours) by default.
- MongoDB infrastructure is prepared but not actively used yet. The `IUserRepository` has placeholder implementations.
- LDAP errors are logged for debugging. Check application logs if authentication fails.
