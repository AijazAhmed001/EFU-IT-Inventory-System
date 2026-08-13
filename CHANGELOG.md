# Changelog

## Security and authorization baseline

- Externalized the development JWT secret and enabled .NET User Secrets.
- Added authentication endpoint rate-limit policies and baseline security headers.
- Corrected frontend session restoration, remember-me storage, refresh serialization, request timeouts/cancellation, and logout ordering.
- Revoked refresh tokens after password change/reset and added logout-from-all-devices API support.
- Added explicit user-permission persistence, a centralized permission catalog, policy-based authorization, and Super Admin permission-management endpoints.
- Added immutable migration `003_user_permissions.sql` without altering migration `002`.
- Added security, authorization, troubleshooting, implementation-status, and validation documentation.

See `docs/IMPLEMENTATION_STATUS.md` and `docs/VALIDATION_REPORT.md` for exact scope and remaining blockers.
