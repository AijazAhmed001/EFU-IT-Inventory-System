# Asset expiry email reminders

The backend hosts the `asset-expiry-daily-reminders` job. It calculates calendar dates in `Asia/Karachi` (configurable), scans active allocated assets for both `WarrantyExpiryDate` and `ExpectedExpiryDate`, resolves the newest unreturned allocation and its active employee, and sends one email per asset/expiry type/recipient/day. The backend process must remain running.

## Configuration and SMTP

Use environment variables shown in `backend/.env.example`, development user-secrets, or a production secret store. Never store SMTP passwords in `appsettings.json`. The sender address comes from `SMTP__From`; sender name, CC and BCC are independently configurable. Test only with a safe development mailbox/provider.

## Database

Migration `005_asset_expiry_reminders.sql` creates `AssetExpiryReminderLogs`, restricted/set-null foreign keys, scan/history indexes, and the unique key `(AssetId, ExpiryType, ExpiryDate, RecipientKey, DaysRemaining)`. The existing startup migration runner applies it automatically and rejects modification of an applied script. To apply explicitly, start the backend:

```powershell
dotnet run --project backend/EFU.Inventory.csproj
```

Pending/Processing/Sent/Failed/Skipped states provide delivery auditability. The unique key and SQL Server `sp_getapplock` prevent repeat scans and multiple app instances from concurrently producing the same reminder. A failed item is retried explicitly from the UI/API; processing continues after per-message failures.

## Operations

Open `/notifications/email-reminders` with `notifications.view`. Users with `notifications.manage` can update settings, preview/test the fixed template, run a scan, and retry failed items. API routes are under `/api/asset-expiry-reminders`; email-triggering actions are rate-limited. Audit records capture the acting user, action, IP (where available), IDs, and correlation ID. SMTP secrets and message bodies are never returned.

Development test data can be created manually or via a dedicated local seed using dates at 0, 1, 15, and 16 days, plus missing-email, retired, and expired cases. No production data is seeded automatically.

## Verification and deployment

```powershell
dotnet restore backend/EFU.Inventory.csproj
dotnet test backend.tests/EFU.Inventory.Tests.csproj
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run build
```

Deploy only one or multiple always-on backend instances connected to the same SQL Server. All instances may host the scheduler; the database application lock elects one runner. Ensure Windows/Linux timezone data is installed; the implementation maps `Asia/Karachi` to `Pakistan Standard Time` on Windows.
