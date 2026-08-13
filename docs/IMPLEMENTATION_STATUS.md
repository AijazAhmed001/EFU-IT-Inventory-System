# Implementation status

## Implemented and source-validated

- Removed the committed development JWT secret and enabled .NET User Secrets.
- Restored browser sessions instead of clearing them at startup.
- Fixed logout ordering and added logout-all support.
- Revoked refresh tokens on password change and reset.
- Added frontend request timeout and `AbortSignal` propagation.
- Aligned the audit report request with the backend's 100-record page limit.
- Added strict authentication endpoint rate-limit policies.
- Added security response headers and correlation IDs.
- Added explicit per-user IT Admin permission storage, authorization policies, management API, and migration 003.
- Changed major endpoint groups from broad IT Admin role access to backend permission checks.

## Not completed or not validated

- The missing `001_initial_schema.sql` was not fabricated. It requires schema review and a blank SQL Server validation run.
- The complete permission-management React UI is not implemented.
- Oversized frontend pages have not all been decomposed.
- Attachment download/delete, signature inspection, and malware integration remain incomplete.
- Full automated test suites, Docker, staging, monitoring, and tested backup restoration remain outstanding.
- Backend compilation and SQL migration execution require .NET 10 and SQL Server, which were unavailable in the editing environment.

This release is an incremental security baseline, not a production-ready certification.
