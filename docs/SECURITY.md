# Security configuration

No secret value belongs in this repository or in a release ZIP. Values previously shared must be rotated outside the application.

For local development, configure .NET User Secrets from `backend`:

```powershell
dotnet user-secrets set "Jwt:Secret" "GENERATE-A-NEW-RANDOM-SECRET-AT-LEAST-32-BYTES"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "YOUR-DEVELOPMENT-CONNECTION-STRING"
dotnet user-secrets set "BootstrapAdmin:Email" "YOUR-INITIAL-ADMIN-EMAIL"
dotnet user-secrets set "BootstrapAdmin:Password" "YOUR-ONE-TIME-STRONG-PASSWORD"
dotnet user-secrets set "SMTP:Password" "YOUR-SMTP-PASSWORD"
```

The bootstrap credentials are needed only when no Super Admin exists. Remove them after the first successful initialization.

Production must supply secrets through environment variables or an approved secret manager. Rotate the JWT secret that appeared in earlier archives; rotation invalidates existing access tokens.

## Environment variable mapping

```text
ConnectionStrings__DefaultConnection
Jwt__Secret
Jwt__Issuer
Jwt__Audience
BootstrapAdmin__Email
BootstrapAdmin__Password
SMTP__Host
SMTP__Port
SMTP__Username
SMTP__Password
SMTP__From
FrontendUrl
```
