# API Contract Summary
All normal responses follow `{ "success": true, "data": ... }`. Paginated responses add `meta`.
Errors follow `{ "success": false, "message": "..." }`.
Protected endpoints require `Authorization: Bearer <accessToken>`.

## Authentication
POST `/api/auth/login` `{email,password}`
POST `/api/auth/refresh` `{refreshToken}`
POST `/api/auth/logout` `{refreshToken}`
GET `/api/auth/me`
PATCH `/api/auth/me`
POST `/api/auth/change-password`
POST `/api/auth/forgot-password`
POST `/api/auth/reset-password`

## Assets
GET `/api/assets?page=1&limit=20&search=&status=&assetTypeId=&vendorId=&sort=&order=`
GET `/api/assets/{id}`
POST `/api/assets` (SUPER_ADMIN, IT_ADMIN)
PUT `/api/assets/{id}` (SUPER_ADMIN, IT_ADMIN)
DELETE `/api/assets/{id}` (SUPER_ADMIN)

## Master data
GET `/api/master/{type}?page=1&limit=10&search=`
POST `/api/master/{type}` (SUPER_ADMIN, IT_ADMIN)
PUT `/api/master/{type}/{id}` (SUPER_ADMIN, IT_ADMIN)
DELETE `/api/master/{type}/{id}` (SUPER_ADMIN)

## Lifecycle transactions
POST `/api/transactions/allocate`
POST `/api/transactions/revoke`
POST `/api/transactions/retire`

## Dashboard / reports / administration
GET `/api/dashboard`
GET `/api/reports/asset-history/{id}`
GET `/api/reports/inventory`
GET `/api/reports/audit?page=1&limit=50`
GET `/api/notifications`
PATCH `/api/notifications/{id}/read`
PATCH `/api/notifications/read-all`
GET `/api/settings`
PUT `/api/settings` (SUPER_ADMIN, IT_ADMIN)
GET `/api/users` (SUPER_ADMIN)
POST `/api/users` (SUPER_ADMIN)
PATCH `/api/users/{id}` (SUPER_ADMIN)
