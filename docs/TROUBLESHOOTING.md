# Troubleshooting

## Port already in use

Find the process using backend port 5002:

```powershell
Get-NetTCPConnection -LocalPort 5002 -State Listen
```

Stop the confirmed process ID, or start on another port:

```powershell
dotnet run --urls "http://localhost:5003"
```

When using port 5003, set the frontend `.env` (not committed):

```text
VITE_API_URL=http://localhost:5003/api
```

Restart Vite after changing environment variables.

## Required configuration missing

The backend intentionally refuses to start when `Jwt:Secret` or the database connection is missing. Configure User Secrets or environment variables using `docs/SECURITY.md`.
