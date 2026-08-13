# Seed Data

Development and lookup seed data is applied idempotently by `Data/DbInitializer.cs` after all SQL migrations complete.

Seeded data includes:
- `SUPER_ADMIN`, `IT_ADMIN`, `VIEWER` roles
- Permission catalog and role-permission mappings
- Configured bootstrap administrator user with a BCrypt password hash
- User-role assignment and notification preferences
- EFU organizational defaults (IT, Finance, HR, Operations, Sales, Administration)
- Pakistan province seed and Karachi / EFU House sample hierarchy
- Asset types, manufacturers, processor, memory, storage and OS lookup values
- Default lifecycle policies
- Default application settings required by the Settings UI

Set `BootstrapAdmin__Email` and `BootstrapAdmin__Password` before initializing a new database. The password is hashed with BCrypt before insertion; no default or plaintext password is kept in source control.
