# EFU Inventory Frontend — Easy Code Guide

## Request flow

`Page component -> src/api.ts -> ASP.NET API -> JSON response -> component state -> screen`

## Important files

- `src/main.tsx`: Starts React and loads the root component.
- `src/App.tsx`: Controls login/session state and page navigation.
- `src/api.ts`: The only shared place for API calls, JWT headers, refresh token handling, and error messages.
- `src/components/Layout.tsx`: Sidebar, header, and page container.
- `src/components/MasterSetup.tsx`: Reusable CRUD screen for Asset Make, Asset Type, Vendor, City, etc.
- `src/components/Assets.tsx`: Asset list.
- `src/components/NewAsset.tsx`: Create/edit asset form.
- `.env`: Local backend URL. Example: `VITE_API_URL=http://localhost:5002/api`.

## Fixed Master Setup bug

The edit form previously copied the complete database response into the PUT request. It sent fields such as:

- `createdAt`
- `updatedAt`
- `deletedAt: ""`
- `isDeleted: "false"`

Those are database metadata fields and caused the backend to return HTTP 500. The new code builds the request from the visible form fields only. Asset Make now sends:

```json
{
  "name": "Apple",
  "status": "Active"
}
```

## How to find an API call

In VS Code press `Ctrl + Shift + F` and search for the route, for example:

```text
/master/asset-make
```

Most CRUD calls are made through `api.get`, `api.post`, `api.put`, `api.patch`, or `api.delete` from `src/api.ts`.

## Run

```powershell
npm install
npm run dev
```

## Build check

```powershell
npm run build
```
