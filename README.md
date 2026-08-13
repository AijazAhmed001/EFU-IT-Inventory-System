# EFU IT Hardware Inventory System

Enterprise hardware inventory application with a React, TypeScript, Vite and Tailwind frontend and an ASP.NET Core, Entity Framework Core and SQL Server backend.

## Requirements

- Node.js 20 or newer
- .NET SDK 10
- SQL Server or SQL Server LocalDB

## Backend

Copy `backend/.env.example` values into environment variables or a secure development-secret store. A new database requires `BootstrapAdmin__Email`, `BootstrapAdmin__Password`, `Jwt__Secret`, and `ConnectionStrings__DefaultConnection`.

```powershell
cd backend
dotnet restore EFU.Inventory.csproj
dotnet run --project EFU.Inventory.csproj
```

Development URL: `http://localhost:5002`

## Frontend

Copy `frontend/.env.development.example` to `frontend/.env.development` and adjust the API URL if necessary.

```powershell
cd frontend
npm install
npm run dev
```

Development URL: `http://localhost:5175`

Production validation:

```powershell
npx tsc --noEmit
npm run build
```

## Configuration

Frontend:

- `VITE_API_URL` — complete API base URL including `/api`
- `VITE_PORT` — Vite development or preview port

Backend:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`
- `Jwt__AccessTokenMinutes`, `Jwt__RefreshTokenDays`
- `FrontendUrl`
- `BootstrapAdmin__Email`, `BootstrapAdmin__Password` for a new database
- `SMTP__Host`, `SMTP__Port`, `SMTP__Username`, `SMTP__Password`, `SMTP__From`

Never commit production passwords, JWT secrets, SMTP credentials, or production connection strings.
