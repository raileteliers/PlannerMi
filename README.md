# PlannerMi

Local-first monthly planner for a single user, on an Android phone and in a
browser at https://raileteliers.github.io/PlannerMi/.
See `DESIGN.md` for the product decisions and `DECISIONS_LOG.md` for what was
settled while building.

## Stack

Expo SDK 54 · React Native 0.81 · React 19 · TypeScript (strict) ·
expo-router · NativeWind (Tailwind v3) · SQLite via `expo-sqlite` (phone) ·
Supabase (shared) · react-native-web (browser) · Zustand · date-fns · Vitest

## Scripts

```bash
npm start          # Expo dev server — scan the QR with Expo Go
npm run android    # open it on a connected device or emulator
npm run web        # the browser build, on localhost
npm run build:web  # the static export CI publishes to GitHub Pages
npm run typecheck  # tsc --noEmit
npm run test       # vitest, pure logic only
npm run lint       # oxlint
```

Metro caches aggressively: after changing an `EXPO_PUBLIC_` value locally, add
`--clear` or the old value stays baked into the bundle. CI always builds clean.

## Where the data lives

Signed out, the phone uses its own SQLite file and the browser keeps the data
in the tab — the app works with no account and no signal, as it always has.

Signing in with GitHub adds a shared Supabase database. The phone keeps writing
to SQLite first and pushes afterwards, so it still works in a tunnel; the
browser reads and writes the server directly, because `expo-sqlite` cannot run
on GitHub Pages (it needs COOP/COEP headers a static host cannot send).

Setting it up: create a Supabase project, run `supabase/migrations/*.sql` in
order, enable the GitHub provider with an OAuth app whose callback is
`https://<ref>.supabase.co/auth/v1/callback`, and allow-list
`https://raileteliers.github.io/PlannerMi/**` and `plannermi://**` as redirect
URLs. Then put the project URL and anon key in `.env.local` (see
`.env.example`), in the repo's Actions secrets, and in `eas.json`.

## Layout

```
app/           the routes, one file per screen (expo-router)
.github/       the workflow that publishes the web build to Pages
supabase/      the migrations: schema, row level security, the two transactions
src/
  auth/        the Supabase client and signing in with GitHub
  components/  the shared widgets (sheets, chips, inputs)
  db/          the storage interface and its implementations
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

`src/logic`, `src/lib` and the pure half of `src/db` carry the tests.
Everything React Native lives above them and is checked on a real phone.

Files ending in `.web.ts` are the browser's version of a module — Metro picks
them over the plain one when bundling for the web. They exist where a native
module has nothing to run in a browser (`expo-sqlite`, `expo-notifications`) or
where the browser does the same job differently (file downloads, the OAuth
redirect). A `Platform.OS` check would not do: the native module would still
end up in the bundle.
