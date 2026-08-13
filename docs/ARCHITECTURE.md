# Architecture

EFU Inventory is a modular monolith with a React frontend and an ASP.NET Core API.

## Frontend

Business screens live in `frontend/src/features`. Shared layout and error-handling components live in `frontend/src/components`; API/session infrastructure lives in `frontend/src/lib`; cross-feature formatters live in `frontend/src/utils`.

## Backend

HTTP endpoints and their business services are grouped under `backend/Features`. Database access and external integrations live under `backend/Infrastructure`; cross-cutting middleware and contracts live under `backend/Common`.

This organization keeps related code together without introducing extra projects, repository wrappers, or CQRS handlers that the current application does not need.
