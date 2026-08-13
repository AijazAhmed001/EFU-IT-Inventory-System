# Authorization

The application combines the three existing roles with explicit permission grants.

- `SUPER_ADMIN` satisfies every permission automatically.
- `IT_ADMIN` receives only explicit user grants stored in `UserPermissions`.
- `VIEWER` receives the fixed read-only set: dashboard, assets, master data, and reports view.

Permission-protected endpoints return `403 Forbidden` for an authenticated user without the required grant. Frontend visibility is a usability feature only; the API remains authoritative.

Super Admin API:

```text
GET /api/permissions
GET /api/users/{userId}/permissions
PUT /api/users/{userId}/permissions
```

The PUT body is:

```json
{ "permissions": ["assets.view", "assets.create"] }
```

Migration `003_user_permissions.sql` adds the explicit-grant table. It is immutable after application.
