# EFU Inventory Frontend

React, TypeScript, Vite and Tailwind CSS application.

## Development

- `npm run dev` starts Vite on `VITE_PORT` or port 5173.
- `npm run build` creates a production bundle.
- `npx tsc --noEmit` performs strict type checking.

## Key files

- `src/App.tsx` — routing, authentication guard and lazy page loading
- `src/api.ts` — API client and session handling
- `src/index.css` — global theme, status and responsive styles
- `vite.config.ts` — standard Vite configuration

Use Tailwind utilities or the existing reusable CSS variables and classes. Preserve accessible labels, inline validation, responsive tables and both light and dark themes.
