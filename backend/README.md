# EFU IT Hardware Inventory — ASP.NET Core Backend

Complete ASP.NET Core Web API backend aligned with the existing React/Vite frontend API contract.

## Stack
- ASP.NET Core 10 Web API
- Entity Framework Core 10
- SQL Server / LocalDB
- JWT access tokens + rotating refresh tokens
- BCrypt password hashing
- Swagger/OpenAPI
- Role-based authorization: `SUPER_ADMIN`, `IT_ADMIN`, `VIEWER`
- Built-in rate limiting, CORS, validation, centralized exception handling

## Run
1. Install .NET 10 SDK and SQL Server LocalDB (or change the connection string).
2. Copy environment values from `.env.example` into your OS environment, User Secrets, or `appsettings.Development.json`.
3. In this backend folder run:
   ```bash
   dotnet restore
   dotnet run
   ```
4. Swagger is available in Development at the URL printed by ASP.NET, then `/swagger`.

The database is created automatically on first run using `EnsureCreatedAsync`. For controlled production migrations install EF CLI and run:
```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Bootstrap administrator
For a new database, configure `BootstrapAdmin__Email` and `BootstrapAdmin__Password` through environment variables or a development secret store. The project contains no default account or plaintext password.

## Frontend connection
Set the Vite frontend environment:
```env
VITE_API_URL=http://localhost:5002/api
```
Use the exact HTTP/HTTPS port printed by `dotnet run`.

## Main API groups
- `/api/auth` login, refresh, logout, profile, change/forgot/reset password
- `/api/dashboard`
- `/api/assets`
- `/api/master/{type}` for all 14 master setup modules
- `/api/transactions/allocate`
- `/api/transactions/revoke`
- `/api/transactions/retire`
- `/api/reports/asset-history/{id}`
- `/api/reports/inventory`
- `/api/reports/audit`
- `/api/notifications`
- `/api/settings`
- `/api/users`

## Master type route values
`asset-type`, `asset-make`, `motherboard`, `memory`, `storage`, `operating-system`, `vendor`, `province`, `city`, `location`, `department`, `office`, `employee`, `lifecycle-policy`.

## Important production notes
Use environment variables or a secret manager for the JWT secret and database credentials. Configure a production SQL Server connection string, HTTPS, reverse proxy, SMTP provider for password-reset email delivery, and replace `EnsureCreatedAsync` with committed EF Core migrations before deployment.


## Database V3 (complete schema)

This package now uses a production-oriented SQL Server database schema with versioned SQL migrations. On first startup, the API creates `EFUInventoryDbV3` (LocalDB default), applies `Database/Migrations/001_initial_schema.sql`, records the migration checksum in `__DatabaseMigrations`, and then applies idempotent seed data through `Data/DbInitializer.cs`.

Database documentation:
- `Database/DATABASE.md` — table, constraint, index and migration documentation
- `Database/ERD.md` — Mermaid ERD
- `Database/Seeds/README.md` — development seed details

Run:
```powershell
dotnet restore
dotnet build
dotnet run
```

Default development database:
```text
Server=(localdb)\\MSSQLLocalDB;Database=EFUInventoryDbV3;Trusted_Connection=True;TrustServerCertificate=True
```

Override it securely with:
```powershell
$env:ConnectionStrings__DefaultConnection='YOUR_SQL_SERVER_CONNECTION_STRING'
dotnet run
```

The bootstrap administrator password is read from configuration and BCrypt-hashed before storage. It is never stored as plaintext.
