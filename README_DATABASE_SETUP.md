# EFU IT Hardware Inventory — Database Integrated Full Stack

## Start backend
```powershell
cd backend
dotnet restore
dotnet build
dotnet run
```

On first run the backend will:
1. Connect to SQL Server LocalDB.
2. Create `EFUInventoryDbV3` if it does not exist.
3. Apply versioned SQL migration `Database/Migrations/001_initial_schema.sql`.
4. Record the migration in `__DatabaseMigrations` with a SHA-256 checksum.
5. Seed roles, permissions, lookup data, lifecycle policies, settings and the development administrator.

Swagger: `http://localhost:5002/swagger`

Development login:
- Email: `admin@efu.com.pk`
- Password: `Password@123`

## Start frontend
```powershell
cd frontend
npm install
npm run build
npm run dev
```

Frontend: `http://localhost:5173`

Copy `frontend/.env.example` to `frontend/.env` when the API is not running at
`http://localhost:5002/api`. The frontend reads `VITE_API_URL` and defaults to that URL.

## Full-stack verification
With the backend running:
```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\smoke-test.ps1
```

This runs the authenticated API, validation, authorization, CORS, CRUD, lifecycle
transaction, report, notification, settings, and password-reset smoke checks.

## Database documentation
See:
- `backend/Database/DATABASE.md`
- `backend/Database/ERD.md`
- `backend/Database/Seeds/README.md`

## Production database configuration
Override the connection string with a secret/environment variable instead of editing source:
```powershell
$env:ConnectionStrings__DefaultConnection='Server=...;Database=...;User Id=...;Password=...;Encrypt=True;TrustServerCertificate=False'
$env:Jwt__Secret='a-long-random-production-secret'
dotnet run
```
