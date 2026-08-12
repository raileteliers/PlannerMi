# Decisions log

Choices made during implementation that `DESIGN.md` did not cover. One line each,
with the reason.

## Phase 0 — Scaffold and design system

- **Six course colors, not eight** (`blue #2563eb`, `teal #0f766e`, `green #15803d`,
  `amber #b45309`, `violet #7c3aed`, `magenta #be185d`) — the open question in
  `DESIGN.md` §7 left the count to whatever survives the 4px test. These six are all
  ≥ 5:1 against white and ≥ 34 apart in CIE76 ΔE. Adding a seventh meant a cyan next
  to teal or a lime next to green, which stopped being distinguishable in a 4px bar.
- **Category colors reuse course tokens** (deporte = blue, salud = green, trámite =
  amber, personal = violet) instead of getting their own hexes — one hue per meaning,
  so the palette stays a closed set.
- **Recurring items render at `opacity: 0.35`** of their own hue rather than a
  separate "muted" hex per color — one token to tune, and it keeps the hue readable.
- **Tokens live in `src/styles/tokens.css` as `--pm-*` variables**, mapped into
  Tailwind's `@theme` in `index.css`. Components use Tailwind utilities; no component
  holds a raw hex. Adding a dark theme means editing one file.
- **Routes are `/mes`, `/dia/:fecha`, `/ramos`, `/ajustes`** — Spanish paths to match
  the interface copy, since URLs are visible to the user. Code and identifiers stay
  in English.
- **`/paleta` is a review screen**, reachable from Ajustes. It is not a product
  feature; it exists so the palette can be checked at real size.
- **`crypto.randomUUID()` needs a secure context** — fine for localhost and any HTTPS
  deploy; noted here in case the app is ever served over plain HTTP on the LAN.

## Phase 1 — Model, persistence and store

- **Monthly recurrences skip months that lack the day** (a series starting Jan 31 has no
  February occurrence and resumes on Mar 31) rather than clamping to the last day of the
  month. Clamping silently changes the day of the month, and `DESIGN.md` rules out
  editing individual occurrences, so a clamped date would be unfixable. Each occurrence
  is computed from the start date, never by stepping off the previous one, so a skipped
  month cannot drift the rest of the series.
- **Deletes go through a two-step `plan` / `apply`** — the plan carries the counts the
  confirmation dialog shows ("3 evaluaciones y 7 tareas") and is the same object that
  gets applied, so the numbers on screen cannot disagree with what is deleted.
- **Unlinking a block deletes the `ref` key** instead of setting it to `undefined`, so
  IndexedDB never stores a dangling key.
- **A cascade delete is one IndexedDB transaction** across all stores: either every
  entity goes and every orphaned block is rewritten, or nothing changes.
- **Import rejects on integrity errors but repairs dangling block refs** — a block whose
  ref points nowhere is imported without the ref and reported as an aviso, never dropped.
  It is the same rule cascade deletion follows; rejecting the whole file over it would
  make a backup unimportable for a reason the user cannot fix.
- **Import reports every problem it finds**, not just the first, so a hand-edited file
  can be fixed in one pass.
- **Import validates `app: 'plannermi'` and `version: 1`** in the envelope, and refuses a
  file from a newer version rather than guessing at its shape.
- **The store keeps the dataset under a single `datos` key** so a failed write can be
  rolled back by restoring one snapshot, not by undoing a mutation.
- **`navigator.storage.persist()` is fire-and-forget** — Chrome refuses it on localhost
  (verified: `persisted() === false` there) and grants it by engagement heuristics once
  installed. A refusal is not something the user can act on, so it is never surfaced.
- **Dev fixture lives in `src/dev/seed.ts`**, exposed as `window.plannermi` in dev builds
  only (`plannermi.seed()`, `.limpiar()`, `.datos()`, `.exportar()`). Its dates are
  relative to today so the month view always has content.
