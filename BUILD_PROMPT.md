# Prompt de construcción — PlannerMi

> Pegale esto a un agente de código con el repo abierto en `/Users/rleteliers/Documents/PlannerMi`.
> El documento de diseño está en `DESIGN.md`, en la raíz del repo.

---

## Contexto

Vas a construir **PlannerMi**, una app personal de organización mensual, local-first, para un
solo usuario en un solo dispositivo Android. El diseño completo ya está decidido y vive en
`DESIGN.md`. **Leelo entero antes de escribir una línea de código.** No es un borrador: cada
decisión ahí tiene una razón registrada, y varias son deliberadamente contraintuitivas (por
ejemplo: no hay spinners, no hay drag para crear bloques, el rojo está vetado como color de
ramo). Si algo te parece raro, la respuesta está en el documento.

Tu trabajo es implementarlo, no rediseñarlo.

## Reglas del encargo

1. **`DESIGN.md` es la fuente de verdad.** Si el documento y este prompt se contradicen, gana
   el documento. Si el documento no cubre algo, elegí la opción más simple y anotala en
   `DECISIONS_LOG.md` en la raíz, con una línea explicando por qué.
2. **No implementes nada de la sección "Fuera de alcance" ni del backlog v2.** Nada de
   notificaciones, tema oscuro, drag de bloques, sync, notas ni promedios. Si te parece que
   algo del backlog es trivial de agregar, no lo agregues.
3. **Los campos reservados van en los tipos desde el día uno**, aunque la UI no los use:
   `Compromiso.recordatorioMin`, `Ramo.archivado`, `BloqueTiempo.ref`,
   `Recurrencia.excepciones`. Están ahí para evitar migraciones futuras.
4. **Copy de interfaz en español** (chileno, informal, voseo tolerado). **Código, tipos,
   nombres de archivo, comentarios y commits en inglés.**
5. Trabajá en fases, en el orden de abajo. **Al terminar cada fase, pará y mostrame lo que
   hiciste antes de seguir.** No construyas las seis fases de un tirón.

## Stack y decisiones técnicas

Estas no están en `DESIGN.md` porque son de implementación, y las fijo acá para que no las
inventes:

- **Vite + React 19 + TypeScript (strict) + Tailwind v4.**
- **Router:** `react-router` con **`HashRouter`**, no `BrowserRouter`. Es lo que hace que un
  futuro empaquetado con Capacitor funcione sin tocar nada.
- **Persistencia:** IndexedDB vía el wrapper **`idb`**. Un solo archivo de esquema con la
  versión de la base y sus `upgrade` handlers, aunque hoy solo exista la v1.
- **Estado:** **Zustand**, con **todo el dataset en memoria**. El volumen real es de cientos de
  registros, no miles: hidratás la base entera al arrancar y cada mutación escribe en memoria
  y en IndexedDB (write-through). Esto hace que la vista mes sea instantánea y que no exista el
  problema de "la UI muestra datos viejos". No metas React Query ni capas de caché: no hay red.
- **Fechas:** `date-fns` con locale `es`. Nunca `new Date(isoString)` para fechas sin hora —
  parsealas explícitamente para evitar el corrimiento de un día por zona horaria.
- **IDs:** `crypto.randomUUID()`.
- **PWA:** `vite-plugin-pwa` con manifest, íconos y estrategia offline-first.
- **Tests:** **Vitest**, solo sobre la lógica pura. No hagas tests de componentes.

## Fases

### Fase 0 — Scaffold y sistema de diseño

Proyecto Vite funcionando, Tailwind configurado, PWA instalable, router con las rutas vacías.

Definí los **tokens de color como variables CSS** (sección 5 de `DESIGN.md`): grises de
superficie/borde/texto, el rojo de importancia, la paleta cerrada de 6-8 colores de ramo y los
4 colores fijos de categoría. Verificá el contraste de los colores de ramo en una barra de 4px
sobre fondo blanco — si alguno no se distingue a ese tamaño, cambialo y decime cuál.

Aunque el MVP es solo tema claro, definí los colores como tokens para que sumar oscuro después
sea editar un archivo.

**Listo cuando:** `npm run dev` levanta, la app se instala como PWA en Chrome, y existe una
página de muestra que renderiza la paleta completa para revisarla.

### Fase 1 — Modelo, persistencia y store

Los tipos de la sección 2 de `DESIGN.md`, tal cual. El esquema de IndexedDB con sus stores e
índices (`evaluaciones` por `ramoId` y por `fecha`, `tareas` por `evaluacionId`, `bloques` por
`fecha`). El store de Zustand con hidratación al arranque y write-through.

Tres piezas de lógica pura que **sí llevan tests**:

- **Expansión de recurrencias:** dado un `Compromiso` con `Recurrencia` y un rango de fechas,
  devolver las ocurrencias, restando `excepciones` y respetando `hasta`. Casos de test: semanal
  con `diasSemana`, intervalo > 1, excepción en el medio, serie con fecha de término.
- **Borrado en cascada:** ramo → evaluaciones → tareas, y los `BloqueTiempo` que apuntaban a lo
  borrado sobreviven con el `ref` limpiado. Es la regla más fácil de implementar mal.
- **Validación del import JSON:** valida el archivo entero **antes** de tocar la base; si algo
  falla, cero escrituras.

Sumá también `navigator.storage.persist()` en el arranque y un módulo de datos de prueba para
desarrollo (4 ramos, ~12 evaluaciones, un par de compromisos recurrentes) que se pueda cargar
desde la consola. Lo vas a necesitar en las fases siguientes.

**Listo cuando:** los tests pasan y podés cargar los datos de prueba y leerlos desde el store.

### Fase 2 — Pantalla Ramos

Sección 3.3 de `DESIGN.md`. Va primero, antes que el mes, porque sin datos las otras dos
pantallas no se pueden evaluar.

Lo importante acá es la **velocidad de carga**: la fila inline con título + fecha, Enter guarda
y deja la siguiente lista. Probalo cargando 12 evaluaciones seguidas y contá los taps. Si son
más de tres por evaluación, algo está mal.

**Listo cuando:** podés cargar 4 ramos y 12 evaluaciones desde cero, archivar un ramo, y
borrarlo viendo la confirmación con los números concretos.

### Fase 3 — Vista mes

Sección 3.1 de `DESIGN.md`. Es la pantalla que define la app; tomate el tiempo.

Los puntos donde esto se hace mal:

- **El mes tiene que entrar completo sin scroll vertical**, en 5 y en 6 filas. Probalo con
  febrero y con un mes de 31 días que arranca domingo.
- **Los tres canales visuales son independientes.** El rojo va en el número del día, nunca en
  una barra. Las barras nunca son rojas.
- Las barras de compromisos recurrentes van con peso visual reducido, no ocultas.
- La normalización a `DatedItem` la hace un selector; el componente de la grilla no debe saber
  que existen `Evaluacion` ni `Compromiso`.

Incluye el bottom sheet del día y la navegación entre meses.

**Listo cuando:** con los datos de prueba cargados, mirás la pantalla y podés decir en tres
segundos qué días son peligrosos y qué ramo te está comiendo el mes.

### Fase 4 — Vista día

Sección 3.2 de `DESIGN.md`. Pantalla partida: franja superior sin hora, timeline abajo de 07:00
a 23:00 en slots de 30 minutos.

**No implementes drag para dibujar bloques.** Tap en slot vacío abre el sheet con la hora
prellenada. El documento explica por qué.

El botón "Agendar" de la franja superior crea el `BloqueTiempo` con su `ref` — es el punto que
conecta las dos features del núcleo, y es el que hay que probar mejor.

**Listo cuando:** podés agendar una evaluación como bloque, moverla de hora editándola,
borrarla, y verificar que borrar la evaluación de origen deja el bloque vivo sin `ref`.

### Fase 5 — Creación global y Ajustes

El FAB "+" con su sheet de tres opciones y la fecha prellenada por contexto. Los tres
formularios (Evaluación, Compromiso, Tarea), incluido el editor de recurrencia del compromiso.

Ajustes con export e import JSON, usando la validación de la fase 1.

**Listo cuando:** podés exportar, borrar toda la base, importar el archivo y quedar exactamente
como estabas.

### Fase 6 — Estados y pulido

Los estados vacíos, de carga y de error de la sección 5 de `DESIGN.md`. Revisá especialmente:

- Que **no haya ningún spinner** en la app.
- El error bloqueante de "la base no abre", que es el único que ocupa pantalla completa.
- Que toda escritura fallida revierta la UI y muestre el toast.
- Que las áreas táctiles sean de 44px mínimo, aunque el elemento visible sea más chico.
- Que la pantalla Ramos vacía funcione como onboarding, sin wizard.

**Listo cuando:** instalás la PWA en un Android real, la usás con datos reales durante un día y
no encontrás nada que se sienta roto.

## Verificación de punta a punta

Al terminar, corré este recorrido completo en un Android real (o en Chrome DevTools con
emulación de dispositivo, mínimo 390px de ancho):

1. Instalar la PWA desde Chrome. Confirmar que abre sin barra del navegador.
2. Pantalla vacía de Ramos → crear 4 ramos con colores distintos.
3. Cargar 12 evaluaciones repartidas en dos meses, marcando 2 como importancia alta.
4. Crear un compromiso recurrente (gimnasio, lunes/miércoles/viernes) y uno único (doctor, con
   hora).
5. Ir al mes: verificar los números rojos, las barras sólidas vs tenues, y que entre completo
   sin scroll.
6. Tap en un día cargado → el sheet → "Organizar día".
7. Agendar una evaluación como bloque, sumar dos bloques de estudio con tap en slots vacíos.
8. Exportar el JSON. Borrar la base desde DevTools. Importar. Confirmar que todo volvió.
9. Cerrar la app, esperar, reabrir: los datos siguen ahí.

Reportá cualquier paso que falle o que se sienta incómodo, con lo que viste — no lo arregles en
silencio ni lo des por bueno.
