# PlannerMi

Local-first monthly planner for a single user on a single Android phone.
See `DESIGN.md` for the product decisions and `DECISIONS_LOG.md` for what was
settled while building.

## Stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict) ·
expo-router · NativeWind (Tailwind v3) · SQLite via `expo-sqlite` · Zustand ·
date-fns · Vitest

## Scripts

```bash
npm start          # Expo dev server — scan the QR with Expo Go
npm run android    # open it on a connected device or emulator
npm run typecheck  # tsc --noEmit
npm run test       # vitest, pure logic only
npm run lint       # oxlint
```

## Layout

```
app/           the routes, one file per screen (expo-router)
src/
  components/  the shared widgets (sheets, chips, inputs)
  db/          the SQLite schema and every statement in the app
  design/      palette, labels, and the token values as TypeScript
  dev/         the fixture behind the dev-only buttons in Ajustes
  features/    the screens' own parts, grouped by screen
  lib/         pure helpers (dates, times, ids, files)
  logic/       the pure core: cascade, recurrence, timeline, import/export
  model/       the domain types
  shell/       app startup and the blocking database error
  store/       the Zustand store and its selectors
tailwind.config.js   every color in the app
```

`src/logic` and `src/lib` are pure and carry the tests. Everything React
Native lives above them and is checked on a real phone.
