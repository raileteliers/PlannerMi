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

## Phase 6 — States and polish

- **No screen renders until the database has answered.** While `status === 'starting'`
  the shell shows with blank content — not a spinner, and not a screen drawn against an
  empty dataset, which is what made Ramos claim "todavía no tenés ramos" to someone with
  four ramos for the first ~50ms of every launch.
- **The failed-write toast is a button.** It dismisses on tap and after 4 seconds, sits
  above the bottom bar, and carries the neutral accent — a red toast would spend the one
  color that means importance.
- **The blocking error screen offers export only when something was read** before the
  failure. A button that exports nothing would be a cruel button.
- **Six 44px color targets and a name field do not fit one row** at 390px, so the new-ramo
  row stacks: name on top, colors below. The dots went from 36px to 44px.
- **Verified there are no spinners** and no loading text anywhere in `src`.

## After phase 6 — the inline evaluación row, on request

- **The date is a bordered box**, not a bare right-aligned number, so it reads as a field
  to fill. Turns red on input it cannot parse.
- **Type, importance and description are part of creating**, opening as soon as the row is
  in use and folding back when it is left empty. `DESIGN.md` §3.3 had them as a later
  refinement ("se editan con un tap en la fila ya creada"); finishing an evaluación in one
  pass is what was asked for, and the fast path is untouched — title, date, save.
- **A ↵ button next to the date**, because a phone keyboard's return key is not something
  you can point at. It does exactly what Enter does.
- **The date field no longer saves on blur.** With chips in the row, tapping one blurred
  the date and saved a half-filled evaluación. Saving is now Enter or the button —
  explicit, which is what the extra fields require.
- **Tipo carries over to the next row, importancia does not.** A run of evaluaciones is
  usually the same type, but a sticky "alta" would paint red day numbers in the month for
  evaluaciones nobody marked, and red is the one channel that has to stay expensive.
- **The row reserves 56px on its right** so the ↵ never shares a spot with the floating
  FAB, where the wrong button would win the tap.

## After phase 6 — bar thickness, on request

- **Bar thickness carries importance and crowding.** Base heights are alta 6px, media 4px,
  baja 3px, multiplied by 1 / 1 / 0.85 / 0.7 for 1-4 items that day and clamped to whole
  pixels between 2 and 6. Below 2px a bar stops being a bar; above 6px the cell starts
  looking like a chart. The gap between bars tightens the same way, 4px down to 2px.
- **This is importance in two channels** — the red day number and now thickness — which
  `DESIGN.md` §3.1 deliberately kept separate. They answer different questions, though:
  red says "something today matters", thickness says *which* of the three things in that
  cell it is. Worth revisiting after a month of real use; if it reads as noise, deleting
  `alturaBarraPx` and going back to a flat 4px is a one-line change.
- **Crowding shrinks instead of growing.** A loaded day could have used taller bars, but
  the cell height is fixed by the no-scroll rule, so density had to come from finer marks.
- **The palette screen documents the scale** at 1, 2, 3 and 4 items per day, since it is
  the one place the visual language can be checked at real size.

## The move to Expo, on request

- **Expo replaces the PWA rather than joining it.** One UI to maintain, and
  testing happens where the app is actually used. The web version stays in
  git history on `build/mvp`.
- **`src/logic`, `src/lib`, `src/model` and the store crossed unchanged** —
  about 1.400 lines, including all 110 tests. Keeping the core free of the DOM
  was what made the port a rewrite of the surface only.
- **SQLite stores each entity as JSON in `id`/`data`**, not a column per
  field. Nothing in the app filters in SQL: the base is read once at startup
  and every screen selects from memory. Columns would be a second copy of
  `model/types.ts` to keep in sync for a query nobody makes. The transaction —
  which the cascade delete and the import both need — works either way.
- **NativeWind keeps the class names**, so `tokens.css` became
  `tailwind.config.js` with the same utility names (`bg-surface`,
  `text-importance`, `rounded-bar`). The palette is closed in the config:
  a stray `bg-red-500` fails to compile rather than spending the importance
  color.
- **`src/design/tokens.ts` mirrors the config by hand** for the places that
  need a color as a value — a bar tinted by its ramo, an SVG stroke. React
  Native has no `var()`.
- **`src/app/` had to be renamed `src/shell/`.** expo-router treats `src/app`
  as a routes directory and had silently adopted it, which is why the first
  build served two screens that do not exist.
- **The month grid is flexbox, not CSS grid**, and the day timeline measures
  its own width with `onLayout`: React Native has no `calc()`, so an entry's
  lane is computed in pixels once the timeline knows how wide it is.
- **Exporting opens the share sheet.** An app cannot drop a file into
  Descargas unasked, and a backup that stays inside the app is not a backup.
  Importing goes through the system document picker; the validation, the
  counts-before-replacing confirm and the rejection reasons are untouched.
- **Two blur-saves became explicit saves.** The new-ramo row and the inline
  evaluación row used to save when the field lost focus, telling "tapped a
  color" from "left the row" via `relatedTarget`. A phone has no such thing,
  so both now save on the return key or the ↵ button — which is the same
  decision the date field already took.
- **The inline evaluación row derives "in use"** from whether anything is
  typed or focused, instead of a container's `onFocus`/`onBlur`. React Native
  does not bubble focus events.
- **Escape no longer reverts an in-place edit**, because a phone keyboard has
  no Escape. Nothing here destroys more than the one field being edited.
- **`window.plannermi` became dev-only buttons in Ajustes.** The fixture is
  the same shape as the end-to-end verification script, so checking a change
  against a full month costs one tap instead of twenty minutes of typing.

## The carga screen, on request

- **A fourth tab, against §3 of `DESIGN.md`**, which fixed the bottom bar at
  three. Asked and confirmed: the tabs go from 33% to 25% of the width each.
  Worth watching on a 390px screen — if "Carga" crowds the others, moving it
  behind Ramos costs one line.
- **Weight is a product, not a sum**: importance × difficulty × closeness.
  Adding them would let three easy controls next month outrank a hard exam
  next week, which is the exact question the screen exists to answer.
- **Difficulty comes from the tipo** — examen 3, prueba 2, control 1.5,
  entrega 1 — so nothing new has to be filled in and every evaluación already
  loaded counts from day one. The cost is that it cannot tell an easy prueba
  from a brutal one in the same ramo; if that starts to bite, a `dificultad`
  field next to `importancia` is the fix, and the model, the import/export
  and three forms would all have to learn it.
- **Closeness decays continuously**, halving every 7 days, instead of a fixed
  window. The order drifts a little each day rather than jumping when
  something crosses a boundary — a list that reorders itself overnight is a
  list you stop trusting.
- **Today counts as day zero**, not as past: an evaluación is ahead of you
  until the day is over.
- **Ramos with nothing ahead stay in the list**, scoring zero, sorted
  alphabetically among themselves. "Nothing due" is an answer, and hiding
  them would make the screen lie about how many ramos you have.
- **The number is never shown.** It has no unit and no meaning on its own;
  only the comparison does, so the bar is drawn as a fraction of the heaviest
  ramo and the score stays out of the interface.
- **No track behind the bar.** An empty ramo shows nothing rather than an
  empty container, the same way an empty day in the month has no bars.
- **Red still means only high importance**, here on the "en N días" label
  when the next evaluación is alta. It is not spent on the bars.

## Notifications, on request

`DESIGN.md` §6 listed notifications as an explicit non-goal and the model kept
`Compromiso.recordatorioMin?` reserved for them. They are in now, so both notes
were removed from the design doc rather than left contradicting the code.

- **An hour before compromisos and bloques, a week before evaluaciones**, as
  asked. The week is the useful distance for something you have to study for;
  an hour is the useful distance for something you have to walk to.
- **9am for anything with no time of day.** Evaluaciones carry only a `fecha`,
  and compromisos may have no `hora`. 9am is early enough that the day is still
  open and late enough not to wake anyone.
- **The schedule is derived from the dataset, not fired from events.** A hook
  watches `data` and rebuilds the whole schedule 1.5s after it settles. Every
  edit — create, delete, import, cascade — lands in `data`, so no call site has
  to remember to notify and no stale reminder can survive an edit.
- **Cancel-everything-and-rebuild instead of diffing.** A few hundred entries
  make the diff not worth its bugs, and ids are stable (`evaluacion:<id>`,
  `compromiso:<id>:<fecha>`, `bloque:<id>`) so rebuilding is idempotent.
- **A 90-day horizon and a 400-notification cap.** Android caps pending alarms
  around 500; a daily recurring compromiso would otherwise spend the budget.
  Recurrences are expanded through the existing `expandCompromisos`, never
  materialized, so the notification code inherits `excepciones` and `hasta`.
- **Archived ramos do not notify.** Archiving already means "out of sight".
- **The decision of what to notify is a pure function** (`src/logic/notifications.ts`,
  `avisosDe`), so it is tested in node like the rest of `src/logic`. The phone
  side only asks for permission and schedules what it returns.

## Fase 10 — La web en GitHub Pages y la base compartida

El pedido: que la app viviera también en una página de GitHub Pages y que
hubiera una base de datos de verdad, guardando la información con la misma
forma que los JSON de siempre. Y, preguntado, que el teléfono siguiera
funcionando sin internet.

- **Un solo código, no una web aparte.** La app ya está en React Native, así
  que la web es el target que Expo ya sabe generar (`react-native-web`), no una
  reescritura. La rama `build/mvp` quedó como lo que fue: el punto de partida.
- **GitHub Pages no puede alojar la base.** Sirve archivos estáticos y no deja
  poner cabeceras. De ahí sale todo lo demás: la base tiene que ser un servicio
  al que la página le habla, y `expo-sqlite` **no puede** correr en la web
  (necesita `SharedArrayBuffer` sobre OPFS, que exige COOP/COEP). Si algún día
  hiciera falta persistencia en el navegador sin cuenta, la salida es IndexedDB
  como otra implementación de `PlannerStorage`, no SQLite.
- **`output: 'single'` y no `'static'`.** Las rutas son dinámicas (`dia/[fecha]`,
  `ramos/[id]`), así que el pre-render igual necesitaría el fallback, y el árbol
  mide la pantalla en el primer frame — pre-renderizarlo sin `window` es pedir
  errores de hidratación. El fallback es copiar `index.html` a `404.html`, que
  es como un host estático sirve una SPA.
- **`.nojekyll` es obligatorio.** Sin él, Jekyll descarta `dist/_expo/` y la
  página carga sin nada de JavaScript, sin un error que lo delate.
- **Una sola tabla `records`, no cinco espejo.** El mismo argumento que ya
  justificaba las cinco tablas idénticas de SQLite: nadie filtra en SQL. Cinco
  tablas en Postgres serían veinte políticas de RLS y una migración de DDL por
  cada entidad nueva. La integridad referencial se queda en `src/logic/cascade.ts`,
  porque el teléfono la aplica sin red.
- **`data` sigue siendo exactamente lo que dice `model/types.ts`.** Sin `user_id`
  adentro, sin validación de esquema en Postgres. Así el JSON exportado es
  intercambiable entre SQLite y Supabase, y `importExport.ts` sigue siendo el
  único que valida.
- **Las dos operaciones atómicas son funciones plpgsql.** Un `apply_delete_plan`
  hecho de varios requests podría dejar el ramo borrado y sus evaluaciones
  vivas, un estado que la app nunca tuvo que manejar. Una llamada a función en
  Postgres es una transacción.
- **La identidad es la cuenta de GitHub.** Es la que el usuario ya tiene, y
  ahorra que la app toque una contraseña nunca.
- **El teléfono escribe local primero y empuja después.** Cada escritura entra a
  SQLite y al `outbox` en la misma transacción — "guardado pero no encolado" no
  puede pasar. Firmar sesión agrega sincronización sin quitar la app offline.
- **Gana el que sincroniza último.** Se empuja antes de traer, así lo escrito
  acá ya está arriba cuando se pregunta qué cambió. Dos dispositivos editando lo
  mismo estando ambos sin red es el único caso en que una edición se pisa en
  silencio; `updated_at` queda por si alguna vez hay que detectarlo.
- **El primer sync sube lo que ya había.** Lo que estaba en el teléfono se
  escribió con el outbox apagado, así que nada lo describiría: al enlazar por
  primera vez se sube todo como `put`s. Es una unión, no una toma: los ids son
  aleatorios y no chocan.
- **La anon key es pública y está bien.** Va literal en el bundle, que es lo que
  significa `EXPO_PUBLIC_`. Identifica al proyecto, no autoriza nada: lo que
  separa los datos de una persona de los de otra es RLS. La `service_role` no
  toca el repo.
- **`baseUrl: "/PlannerMi"` está escrito a mano** en `app.json`. Si el repo se
  renombra o pasa a un dominio propio, hay que cambiarlo o todo da 404.
