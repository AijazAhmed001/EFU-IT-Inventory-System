# Refactoring notes

The August 2026 structural refactor preserves runtime behavior and API routes while making feature ownership easier to understand.

- Frontend pages moved from one general `components` folder into business features.
- The shared API/session client moved to `src/lib/api.ts`.
- Backend controllers and services moved into matching feature folders.
- Persistence and email implementations moved under `Infrastructure`.
- Runtime logs, build outputs, dependency folders, IDE state, local `.env`, and embedded Git metadata are excluded from the distributable archive.
- `VolumeTestSeeder` remains because application startup still references it.
- Large page components were not mechanically split into arbitrary fragments; that should be done feature-by-feature with UI tests.
