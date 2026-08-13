# Permission Management

## Role behavior

| Role | Effective access |
|---|---|
| `SUPER_ADMIN` | Every catalog permission; evaluated from the current database user status/role and cannot be edited through user grants. |
| `IT_ADMIN` | Only active, explicit `UserPermissions` grants. Different users may have different grants. |
| `VIEWER` | Read-only dashboard, assets, inventory report, and Master Data view operations. Mutation policies are always denied. |

The API authorization handler reads the current database state on every protected request. There is no permission cache and JWT permission claims are not used. The frontend refreshes `/api/auth/me` on focus and every 30 seconds; API revocations take effect on the next request.

## Catalog

The canonical catalog is `backend/Authorization/Permissions.cs`. It includes Dashboard; Assets; Asset Attachments; Allocations; Returns; Retirement; each implemented Master Data type; inventory, history and audit reports plus PDF/CSV/Excel export capabilities; Notifications; Users; Settings; Audit; Sessions; and Backups.

Mutation permissions depend on their matching view permission. The API rejects an inconsistent set; the management UI automatically adds required permissions and removes direct dependents.

## Database migration

`004_permission_history.sql` adds append-only `PermissionHistory` events without changing `003_user_permissions.sql`. Each event records target, permission, old/new values, actor, UTC timestamp, and correlation ID. Active grants remain in the existing `UserPermissions` table; revoked rows are retained rather than deleted.

## Windows setup

```powershell
cd D:\EFU_Inventory_Improved_Security_Authorization_Baseline\EFU_IT_Hardware_Inventory_Database_Integrated_FullStack
dotnet restore .\backend\EFU.Inventory.csproj
dotnet build .\backend\EFU.Inventory.csproj
dotnet test .\backend.tests\EFU.Inventory.Tests.csproj

cd .\frontend
npm ci
npx tsc --noEmit
npm run build
npm run dev
```

Configure the backend connection string and a JWT secret of at least 32 bytes using .NET user-secrets or environment variables; never commit them. Run the API with `dotnet run --project .\backend\EFU.Inventory.csproj` from the repository root. Numbered SQL migrations are applied by the existing migration runner at startup.
