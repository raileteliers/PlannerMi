# PlannerMi

Local-first monthly planner for a single user on a single Android device.
See `DESIGN.md` for the product decisions and `BUILD_PROMPT.md` for the build plan.

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind v4 · react-router (HashRouter) ·
IndexedDB via `idb` · Zustand · date-fns · vite-plugin-pwa · Vitest

## Scripts

```bash
npm run dev        # dev server (service worker enabled)
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run typecheck  # tsc -b
npm run test       # vitest, pure logic only
npm run lint       # oxlint
```

## Layout

```
src/
  app/       app shell (header, bottom tabs)
  design/    color palette tokens as TypeScript
  lib/       pure helpers (dates, ...)
  routes/    one file per screen
  styles/    tokens.css — every color in the app
```
