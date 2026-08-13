# EFU IT Hardware Inventory — Integration Test Report

Date: 24 July 2026  
Tested project: `EFU_IT_Hardware_Inventory_Database_Integrated_FullStack`

## Final result

- Frontend production build: **PASS**
- Backend build: **PASS** (0 warnings, 0 errors)
- Backend startup: **PASS**
- SQL Server LocalDB connection: **PASS**
- SQL migration/checksum verification: **PASS**
- Automated API/integration suite: **85/85 PASS**
- Browser login/session/logout flow: **PASS**
- Responsive login layout and stable error state: **PASS**
- Interactive server-health indicator: **PASS**
- Browser asset Create/Read/Update/Delete flow: **PASS**
- Browser frontend-to-backend integration: **PASS**
- Final browser console: **PASS** (0 warnings/errors)
- CORS preflight: **PASS**
- Frontend production dependency audit: **PASS** (0 vulnerabilities)

## Database verification

- Server: `(localdb)\MSSQLLocalDB`
- Database: `EFUInventoryDbV3`
- Application tables: `36`
- Applied migration: `001_initial_schema.sql`
- Stored checksum: `526197F7B508BC9C51B927D55F871B7E95EA861224B8DF5C307CAB071AF9A0CD`
- Current file checksum: `526197F7B508BC9C51B927D55F871B7E95EA861224B8DF5C307CAB071AF9A0CD`

The backend automatically creates the database when needed, validates previously
applied migration checksums, applies pending versioned SQL migrations, and then
seeds required lookup/development data. `dotnet ef` is not required for this project.

## Tested API areas

- Authentication: login, invalid login, validation, current user, refresh-token rotation, logout
- Public health check: live backend availability for the login screen
- Passwords: forgot password, reset password, change password, invalid current password
- Authorization: unauthenticated access and viewer role restrictions
- Dashboard: statistics and every chart/table response collection
- Assets: list, detail, create, update, delete, duplicate validation, invalid payload
- Master data: list contracts for all 14 types, create, update, delete, unknown route
- Users: list, create, update, delete, self-delete protection, safe response projection
- Transactions: allocate, revoke, retire, plus invalid-state conflict handling
- Reports: inventory, asset history, audit activity
- Settings: read and update
- Notifications: list, mark all read, mark one read/not-found
- Profile: read and update
- CORS: authorized browser-origin preflight

## Frontend/API mapping

| Frontend area | Backend endpoints |
|---|---|
| Login/session/profile | `/api/auth/*` |
| Dashboard | `/api/dashboard` |
| Asset list/details/editor | `/api/assets` |
| New asset | `/api/assets` and `/api/master/*` lookups |
| Master Setup (14 types) | `/api/master/{type}` |
| Allocation/revocation/retirement | `/api/transactions/*` |
| Inventory/history/audit reports | `/api/reports/*` |
| Notification badge/center | `/api/notifications/*` |
| General/security settings | `/api/settings` |
| User Management | `/api/users` |

## Issues fixed

- Replaced mock frontend datasets with database-backed API calls.
- Added centralized authenticated API handling, Bearer tokens, automatic refresh, and session persistence.
- Prevented password hashes and recursive entity graphs from leaking in user/profile responses.
- Fixed generic master-data serialization that previously returned only base IDs/timestamps.
- Added response-contract regression checks for dashboard, master data, and user safety.
- Connected all master-data dropdowns and relational labels to live database data.
- Implemented real dashboard statistics, trends, distributions, recent allocations, and latest assets.
- Implemented asset list/details plus browser-tested Create/Read/Update/Delete.
- Prevented asset edits from clearing technical fields not shown in the compact editor.
- Fixed successful `204 No Content` deletes in the frontend API client.
- Implemented live transaction, reports, notification, profile, settings, and user-management screens.
- Added user deletion with self-deletion protection and refresh-token revocation.
- Added configuration-driven SMTP password-reset delivery with safe development fallback.
- Added JWT secret validation and safe production bootstrap-admin configuration.
- Fixed notification ownership checks.
- Fixed Reports and Notifications React effects that crashed under development Strict Mode.
- Removed the unnecessary SQL MARS option and its transaction/savepoint warnings.
- Added notification counts and accessible names for header controls.
- Prevented login autofill from contaminating global search and new-user forms.
- Fixed the desktop login card overflow and the vertical layout jump when an error appears.
- Made tablet/mobile layouts present the login form first and avoid clipped content.
- Added an interactive live server indicator, Caps Lock feedback, polished loading feedback, and motion-safe login animations.
- Aligned the default frontend/backend development ports to `5173` and `5002`.
- Cleaned timestamped smoke-test accounts left by earlier runs.

## Remaining limitations

- SMTP delivery requires real `SMTP__*` values. The development reset-token flow was tested.
- No Google sign-in UI or backend endpoint exists. The existing Microsoft button is intentionally disabled because OAuth is not configured.
- The production frontend bundle is about 720 KB and triggers Vite's non-failing code-splitting warning.
- There is no separate unit-test project; the executable database/API smoke suite supplies integration coverage.
- The frontend npm audit returned zero vulnerabilities. NuGet's live vulnerability-advisory query timed out twice; package restore, inventory, compilation, startup, and runtime tests all passed.
- Another unrelated backend installation can use port 5000. The project defaults are now consistently `5002` for the backend and `5173` for the frontend.

## Exact local run commands

Prerequisites: .NET 10 SDK, Node.js/npm, and SQL Server LocalDB.

### Terminal 1 — backend

```powershell
cd "C:\Users\efu\Downloads\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\backend"
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet restore
dotnet run --no-restore -- --urls http://localhost:5002 --FrontendUrl http://localhost:5173
```

Startup automatically connects to LocalDB and applies/verifies the SQL migrations.
Swagger is available at `http://localhost:5002/swagger`.

### Terminal 2 — frontend

```powershell
cd "C:\Users\efu\Downloads\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\frontend"
$env:VITE_API_URL = "http://localhost:5002/api"
npm ci
npm run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`.

Development login:

- Email: `admin@efu.com.pk`
- Password: `Password@123`

These defaults are development-only. A new non-development database requires
`BootstrapAdmin__Email` and `BootstrapAdmin__Password`.

## Test commands

Frontend production build and dependency audit:

```powershell
cd "C:\Users\efu\Downloads\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\frontend"
npm run build
npm audit --omit=dev --audit-level=moderate
```

Backend build:

```powershell
cd "C:\Users\efu\Downloads\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack\backend"
dotnet restore
dotnet build --no-restore
dotnet test --no-build
```

With the backend running on port 5002:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\smoke-test.ps1 -BaseUrl http://localhost:5002/api
```
