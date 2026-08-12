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
  only (`plannermi.seed()`, `.clear()`, `.data()`, `.exportFile()`). Its dates are
  relative to today so the month view always has content.
- **The service worker is disabled in dev** (`devOptions.enabled: false`). Its precache
  served stale CSS and JS through every edit, which cost an hour of chasing a styling
  bug that was not there. Installability is verified on `npm run preview`.

## Phase 2 — Ramos screen

- **Dates are typed, not picked.** A native `<input type="date">` costs three taps per
  evaluación on Android; the field takes `12/9` (also `12-9`, `12.9`, `12/9/27`) and
  refuses what it cannot parse. With no year typed, it assumes the current one unless
  the date is more than three months past, which means next year — that is loading
  March in December, not a typo.
- **Enter chains the fields**: Enter on the title jumps to the date, Enter on the date
  saves and returns to the title. Loading a semester is one uninterrupted run: one tap
  to start, then keyboard only.
- **Inline rows clear their fields before awaiting the write.** At typing speed the next
  name starts arriving while IndexedDB is still busy, and it landed on top of the
  previous one ("Física GeneralProgramación"). On a failed write the text is put back.
- **The new-evaluación row keeps its values in a ref, not only in state.** Enter saves
  and moves focus, which fires the date field's blur in the same tick, before React has
  re-rendered — every evaluación was created twice. The ref is emptied synchronously so
  the second call finds nothing to save.
- **The empty state and the list share one layout.** Rendering a separate "no ramos"
  screen unmounted the input the moment the first ramo was saved, and the next name was
  typed into nothing.
- **Ramos are sorted alphabetically and tareas by pending-then-title.** IndexedDB
  returns records in primary-key order and the keys are UUIDs, so without a sort the
  lists reshuffle on every reload.
- **New ramos take the next unused color** from the palette, so four ramos in a row are
  never the same color. Tapping a dot overrides it.
- **Blur inside the same row does not save.** Tapping a color dot blurs the name field;
  saving there would create a ramo with a half-typed name.
- **Deleting is offered under archiving, and only the delete is red.** The confirmation
  carries the plan's real counts and also says how many bloques survive unlinked.

## Phase 3 — Month view

- **The grid fits by construction**, not by measurement: the rows are
  `repeat(n, minmax(0, 1fr))` inside a flex column, so a 5-week February and a 6-week
  March both fill the same height without scrolling.
- **Weeks start on Monday**, the way a Chilean calendar reads. `Recurrencia.diasSemana`
  stays 0-6 Sunday-first as `DESIGN.md` defines it; only the display differs.
- **Leading and trailing days show their bars**, dimmed to 50%, with the day number in
  the tertiary gray. Hiding them made the last row look like an empty week when it
  wasn't.
- **When a day has more than four items, the routine ones fall off.** Bars are ordered
  evaluaciones → one-off commitments → recurring, so the four that survive are always
  the most exceptional. Nothing is actually lost: the day sheet lists everything.
- **The day sheet is built from the entities, not from `DatedItem`** — it needs the ramo
  name, the hour and the type, which the grid's normalized shape deliberately drops.
- **The visible month is component state, not a route param.** Leaving the tab and
  coming back returns to the current month, which is the common case; deep-linking a
  specific month has no user in the MVP.
- **Swipe threshold is 50px horizontal and must exceed the vertical delta**, so
  scrolling a sheet or tapping a cell never changes month by accident.

## Phase 4 — Day view

- **Times are typed like dates**: the block sheet takes `19`, `19:30`, `1930`, `9.30`.
  Same reason as `parseFechaCorta` — a native time picker costs taps.
- **"Agendar" suggests 18:00**, or the first free half-hour after it, falling back to the
  first gap in the day. It has to land somewhere, and the evening is where study blocks
  go; the sheet is open with the hour editable before anything is saved.
- **A slot is 44px** (the minimum touch target), so the timeline scrolls — only the
  month is required to fit. It opens scrolled to the current hour, or to 08:00 on
  another day, and does not re-scroll afterwards.
- **Overlapping entries share the width in columns** instead of hiding each other.
  Entries that overlap transitively form one group and all get the same column count, so
  the edges line up.
- **The top strip holds tareas dated that day**, not every pending task. `DESIGN.md`
  says "tareas pendientes"; the undated backlog would flood the strip and has no reason
  to belong to this particular day.
- **Commitments appear in the timeline but are not editable there** — they are drawn on
  the muted surface with no border, and only `BloqueTiempo` cards are buttons. Editing a
  commitment is the phase 5 form; editing it from the timeline would need to answer what
  a single occurrence of a series means, which is out of scope.
- **A block's color comes from what it points at** (ramo color, category color) and a
  loose block is gray. That makes the ref visible: when the source is deleted, the bar
  turns gray on its own.
- **A new block never spills past 23:00** — the last slot proposes 22:30-23:00 — and any
  entry outside the timeline is clipped rather than drawn beyond it.

## Phase 5 — Global creation and Ajustes

- **The context date lives in a tiny separate store** (`useUiStore`), set by each screen:
  the day you tapped in the month, the day you are organizing, today on Ramos. The FAB
  reads it, so it never has to know which screen it is floating over.
- **The FAB gets its own lane.** Floating it over the month grid covered the last week's
  Sunday, which is a real day you can no longer tap. The month reserves 56px at the
  bottom and the timeline adds the same at the end, so nothing lives under it.
- **The FAB is hidden on Ajustes and the palette screen** — there is nothing to create
  there.
- **Editing an evaluación, compromiso or tarea happens from the day sheet**, replacing
  the list inside the same sheet rather than stacking a second one: only one thing floats
  at a time. Ramos already edits evaluaciones and tareas; this is the only place a
  compromiso can be edited at all, which is why it is here.
- **Cancelling one occurrence is offered when the form is opened from a specific day**
  ("Cancelar solo el vie 14 ago") and appends to `Recurrencia.excepciones`. Deleting the
  compromiso itself is relabelled "Eliminar toda la serie" so the two are not confused.
  `DESIGN.md` allows cancelling an occurrence and forbids moving one; this is the
  cancelling half.
- **Import shows the counts before replacing anything** and needs an explicit confirm,
  because it destroys what is there. A rejected file lists every reason and writes
  nothing.
- **Titles carry gender by hand** (`Nuevo compromiso`, `Nueva evaluación`): built from a
  lookup, not from concatenating "Nueva " with the entity name.
- **A tarea can hang off one of the next 8 upcoming evaluaciones**, shown as chips with
  their ramo color, instead of a long select of everything ever created.
