# TeamSync Backend

.NET 8 backend application built with **DDD (Domain-Driven Design)** and **Clean Architecture** principles.

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
