# EFU IT Hardware Inventory Database

## Database engine
SQL Server / SQL Server LocalDB via Entity Framework Core 10.

## Migration strategy
The application uses versioned, checksum-protected SQL migrations in `Database/Migrations`. `SqlMigrationRunner`:
1. Creates the configured database when it does not exist.
2. Creates `__DatabaseMigrations`.
3. Executes pending `.sql` files in filename order inside transactions.
4. Stores a SHA-256 checksum for every applied migration.
5. Refuses startup if an already-applied migration file is modified.

The initial migration is `001_initial_schema.sql`.

## Core tables

### Security and identity
- **Roles**: normalized system role definitions.
- **Permissions**: permission catalog.
- **UserRoles**: many-to-many user/role junction.
- **RolePermissions**: many-to-many role/permission junction.
- **Users**: account/profile data and BCrypt password hashes. `Role` remains as a compatibility projection for existing JWT/controller code.
- **RefreshTokens**: hashed refresh tokens, expiry and revocation.
- **PasswordResetTokens**: hashed one-time password reset tokens.
- **EmailVerificationTokens**: hashed one-time verification tokens.
- **LoginActivities**: successful/failed login audit records.

### Master setup
- **AssetTypes**: name, serial prefix, description, status.
- **AssetMakes**: manufacturers.
- **Motherboards**: processor/motherboard and generation.
- **Memories**: RAM size/type.
- **Storages**: storage type/capacity.
- **OperatingSystems**: OS name/version.
- **Vendors**: supplier contact, NTN and status.
- **Provinces**, **Cities**, **Locations**: Province -> City -> Location hierarchy.
- **Departments**, **Offices**, **Employees**: organizational hierarchy used for allocation.
- **LifecyclePolicies**: lifespan, warranty, depreciation, salvage percentage and end-of-life action by asset type.

### Asset lifecycle
- **Assets**: complete hardware record including serial, asset tag, specifications, procurement data, networking/system details, warranty and expected expiry.
- **Allocations**: assignment of an asset to an employee.
- **Revocations**: asset returns/revocations.
- **Retirements**: end-of-life, condition, action, salvage and disposal information.
- **AssetStatusHistories**: immutable lifecycle transition history used for audit and timeline reporting.

### Operations
- **Notifications**: user/global system alerts and read state.
- **UserNotificationPreferences**: per-user alert preferences.
- **ActivityLogs**: audit trail for API actions.
- **SystemSettings**: key/value settings used by General, Regional, Security and Backup settings pages.
- **ReportRuns**: report generation history and filters.
- **BackupRuns**: automatic/manual backup operation metadata.
- **StoredFiles**: secure metadata/reference table for profile images or future approved attachments; file bytes are stored outside the relational DB.

## Data integrity
- GUID primary keys for domain entities.
- Foreign keys with restrictive or SET NULL delete behavior depending on lifecycle requirements.
- Soft deletion through `IsDeleted` and `DeletedAt` for domain/master records.
- Filtered unique indexes allow a soft-deleted value to be re-created safely.
- Check constraints enforce statuses, non-negative financial values, valid lifespan/warranty values and salvage percentages.
- Monetary fields use `decimal(18,2)`; salvage percentage uses `decimal(5,2)`.

## Performance indexes
Indexes cover:
- User email, employee code, role/status.
- Master-data names and business identifiers.
- Asset code, serial number, asset tag, status, asset type, location, purchase date, warranty expiry and expected expiry.
- Active allocation lookups by asset/employee.
- Asset history timelines.
- Notification unread queries.
- Audit log entity/user timelines.
- Report/backup histories.

## Transactions
Allocation, revocation and retirement APIs use database transactions. Each operation updates the asset state and writes the corresponding lifecycle record atomically.

## Environment configuration
Prefer the standard ASP.NET Core environment variable:
`ConnectionStrings__DefaultConnection`

Example LocalDB:
`Server=(localdb)\\MSSQLLocalDB;Database=EFUInventoryDbV3;Trusted_Connection=True;TrustServerCertificate=True`

For production, inject the connection string through the host/secret manager. Do not commit production credentials.
