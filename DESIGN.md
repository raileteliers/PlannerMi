# PlannerMi — Documento de diseño del MVP

> Documento de producto. Define **qué** se construye y **por qué**, no cómo implementarlo.
> El prompt de construcción para el agente de código es un paso posterior y separado.

---

## 1. Propósito y alcance del MVP

**PlannerMi** es una app personal de organización mensual para un solo usuario, en un solo
dispositivo Android. Su objetivo es que el dueño vea **la forma de su mes de un vistazo** y
pueda **organizar el día** cuando le toca ejecutarlo.

No es solo una app de universidad. Convive lo académico (ramos, evaluaciones) con lo
personal (doctor, psicólogo, deporte, trámites). La inspiración es Notion, pero PlannerMi
es deliberadamente más angosta y más rápida: hace dos cosas y las hace bien.

**Restricciones fijas:**

- Web app local-first: React + TypeScript + Vite + Tailwind.
- Persistencia en IndexedDB vía el wrapper `idb`.
- Sin backend, sin autenticación, sin sync, sin cuentas externas.
- PWA instalable. Mobile-first sobre Android/Chrome; el desktop es un caso secundario.
- Copy de interfaz en español. Código, tipos y nombres de archivo en inglés.

**El MVP son dos features de núcleo, más una pantalla de soporte:**

1. **Vista mes** — el mes completo en pantalla, centrado en evaluaciones.
2. **Vista día** — organizar el día en bloques de tiempo.
3. **Pantalla Ramos** — soporte, no núcleo: existe porque sin ella cargar los datos es tan
   tedioso que la app queda vacía y muere en la primera semana.

**Criterio de éxito:** al empezar el semestre, cargar 4 ramos y ~12 evaluaciones toma menos
de diez minutos; y en un día cualquiera, abrir la app y saber qué toca hoy toma un tap.

---

## 2. Modelo de dominio

Cinco entidades. Todas las fechas se guardan como string ISO `YYYY-MM-DD` en hora local (no
`Date`, no UTC): la app es de un solo dispositivo y las zonas horarias solo traen bugs de
"la evaluación aparece un día antes".

```ts
type Importancia = 'alta' | 'media' | 'baja';
type ISODate = string;   // 'YYYY-MM-DD'
type HoraHHMM = string;  // '14:30'

interface Ramo {
  id: string;
  nombre: string;
  sigla?: string;
  color: ColorToken;      // de la paleta cerrada; nunca rojo
  archivado: boolean;     // separa semestres sin necesidad de una entidad Semestre
}

interface Evaluacion {
  id: string;
  ramoId: string;
  titulo: string;
  fecha: ISODate;
  tipo: 'prueba' | 'control' | 'entrega' | 'examen';
  importancia: Importancia;
  descripcion?: string;
}

interface Compromiso {
  id: string;
  titulo: string;
  fecha: ISODate;                 // fecha de inicio si es recurrente
  hora?: HoraHHMM;
  duracionMin?: number;
  categoria: 'salud' | 'deporte' | 'tramite' | 'personal';
  importancia: Importancia;
  recurrencia?: Recurrencia;
  recordatorioMin?: number;       // reservado; el MVP no notifica
}

interface Recurrencia {
  frecuencia: 'diaria' | 'semanal' | 'mensual';
  intervalo: number;              // cada N días/semanas/meses
  diasSemana?: number[];          // 0-6, solo si frecuencia === 'semanal'
  hasta?: ISODate;
  excepciones: ISODate[];         // ocurrencias canceladas
}

interface Tarea {
  id: string;
  titulo: string;
  evaluacionId?: string;          // opcional: existen tareas sueltas
  fecha?: ISODate;                // opcional: existen tareas sin fecha
  hecha: boolean;
}

interface BloqueTiempo {
  id: string;
  fecha: ISODate;
  horaInicio: HoraHHMM;
  horaFin: HoraHHMM;
  titulo: string;
  ref?: { tipo: 'evaluacion' | 'compromiso' | 'tarea'; id: string };
}
```

**Interfaz común para el render del mes.** La grilla del mes no conoce `Evaluacion` ni
`Compromiso`: consume una lista normalizada.

```ts
interface DatedItem {
  id: string;
  fecha: ISODate;
  titulo: string;
  color: ColorToken;
  importancia: Importancia;
  esRecurrente: boolean;
  origen: 'evaluacion' | 'compromiso';
}
```

**Relaciones y reglas:**

- `Ramo 1—N Evaluacion 1—N Tarea`. `Compromiso` es independiente, no cuelga de nada.
- Las ocurrencias recurrentes **no se materializan** en la base. Se expanden en memoria al
  consultar un rango de fechas, restando `excepciones`.
- **Borrados en cascada:**
  - Borrar un `Ramo` borra sus evaluaciones y las tareas de esas evaluaciones. La
    confirmación muestra los números concretos ("Se eliminarán 3 evaluaciones y 7 tareas").
    Borrar es para el error de tipeo; para el semestre que terminó existe archivar.
  - Borrar una `Evaluacion` borra sus tareas.
  - Los `BloqueTiempo` cuyo `ref` apunta a algo borrado **sobreviven**: se les limpia el
    `ref` y quedan como bloque suelto con su título. Ese tiempo lo ocupaste igual.
- Al primer uso se pide `navigator.storage.persist()` para que Chrome no desaloje la base.

**Fuera del modelo, a propósito:** notas, ponderaciones y promedios. La importancia se
marca a mano.

---

## 3. Pantallas

### 3.1 Vista mes

**Propósito:** ver la forma del mes de un vistazo. Es la pantalla de consulta, no de
edición.

**Layout:** header con mes y año + grilla de 7 columnas × 5-6 filas, **completa en pantalla,
sin scroll vertical**. En un Android típico la celda queda de ~52px de ancho por ~90px de
alto: alta y angosta, así que los ítems se apilan en vertical.

**Anatomía de la celda:**

```
┌────────┐
│  14    │  número del día (rojo + bold si hay algo de importancia alta)
│ ▬▬▬▬   │  barra 4px sólida — evaluación, color del ramo
│ ▬▬▬▬   │  barra 4px sólida — compromiso único, color de categoría
│ ▭▭▭▭   │  barra 4px tenue  — compromiso recurrente
└────────┘
```

Hasta 4 barras por día. El día de hoy lleva un indicador propio (fondo gris muy claro).

**Los tres canales visuales, separados a propósito:**

| Canal | Significa | Cómo se ve |
|---|---|---|
| Color | Qué es | Color del ramo (evaluaciones) o de la categoría (compromisos) |
| Rojo | Importancia alta | El **número del día** en rojo y bold — nunca una barra |
| Relleno | Excepcional vs rutinario | Barra sólida = único; barra tenue = recurrente |

El rojo está vetado como color de ramo y de categoría. Así el rojo significa una sola cosa
y no se diluye.

**Interacciones:**
- Tap en un día → **bottom sheet** con la lista de ese día (evaluaciones, compromisos,
  tareas con esa fecha). Desde el sheet, un botón "Organizar día" entra a la vista día.
- Swipe horizontal o flechas en el header → mes anterior / siguiente.
- FAB "+" → sheet de creación con la fecha prellenada según el día seleccionado.

**Estados:**
- *Vacío total:* la grilla se muestra igual, vacía, con una línea discreta abajo que apunta
  a Ramos. Un mes sin nada no es un error, es un mes tranquilo.
- *Mes sin ítems pero con datos cargados:* sin mensaje. Silencio.
- *Carga:* ninguna. Leer IndexedDB local son milisegundos; un spinner de 40ms parpadea y es
  peor que nada.

### 3.2 Vista día

**Propósito:** decidir cuándo hacés lo que tenés que hacer.

**Layout partido en dos:**

- **Franja superior "Hoy"** — lo que **no** tiene hora: evaluaciones que caen ese día,
  tareas pendientes. Es el *qué*. Cada ítem tiene una acción "Agendar".
- **Timeline** — de **07:00 a 23:00, en slots de 30 minutos**. Compromisos con hora ya
  ubicados + los `BloqueTiempo` que creaste. Es el *cuándo*. Línea de hora actual visible.

**Interacciones:**
- Tap en un slot vacío → sheet de creación de bloque con hora de inicio prellenada y
  duración por defecto de 1 hora. **No hay drag para dibujar bloques**: en celular compite
  con el scroll del timeline y produce bloques de 15 minutos por accidente.
- Tap en un bloque existente → editar o borrar.
- "Agendar" desde la franja superior → crea un `BloqueTiempo` con `ref` al ítem de origen.
  Es la razón de ser del campo `ref`.
- Checkbox en las tareas de la franja superior (área táctil de 44px, aunque el cuadrito sea
  de 16px).
- Navegación entre días: swipe horizontal.

**Estados:**
- *Vacío:* el timeline con sus líneas horarias y la marca de la hora actual. Ya se ve como
  algo; no necesita ilustración ni mensaje.
- *Franja superior vacía:* la franja colapsa, no muestra placeholder.

### 3.3 Pantalla Ramos

**Propósito:** cargar datos rápido. Es la puerta de entrada de la app y la respuesta al
riesgo real de que quede vacía.

**Layout:** lista de ramos, cada uno con su color, su nombre y un contador de evaluaciones
pendientes. Tap en un ramo abre su detalle: sus evaluaciones ordenadas por fecha, cada una
colapsada, expandible para ver y editar sus tareas anidadas.

**Interacciones:**
- "+" en el detalle → **fila inline editable** con título + fecha. Enter guarda y deja la
  siguiente fila lista. Cargar 12 evaluaciones son 12 filas seguidas, sin abrir y cerrar un
  modal doce veces.
- Tipo, importancia y descripción se editan con un tap en la fila ya creada. El formulario
  rápido optimiza el momento real: cargás el semestre entero de golpe con el calendario
  académico al lado, y refinás después.
- Toggle **archivar** en el detalle del ramo. Un ramo archivado desaparece del mes y de la
  vista día, pero conserva sus datos.
- Borrar ramo, con la confirmación numérica descrita en el modelo.

**Estados:**
- *Sin ramos (primer uso):* el estado más importante de la app. "Todavía no tenés ramos" +
  un botón grande para crear el primero. **Sin wizard de onboarding: la pantalla vacía es el
  onboarding.**
- *Ramo sin evaluaciones:* la fila inline de creación ya visible y enfocada, sin texto
  explicativo.

### 3.4 Shell y navegación

- **Barra inferior con tres tabs: Mes · Hoy · Ramos.** "Hoy" salta siempre a la vista día de
  la fecha actual desde cualquier lado — es el gesto más frecuente en el celular.
- **Ajustes** vive en un ícono de engranaje en el header, no como tab: adentro solo hay
  export/import JSON y la paleta de colores. No merece un tercio de la barra.
- **FAB "+"** único y global: abre un sheet con tres opciones — Evaluación, Compromiso,
  Tarea — con la fecha prellenada según el contexto desde el que se abrió.

### 3.5 Ajustes

Export JSON (descarga el estado completo) e import JSON (valida el archivo **antes** de
tocar la base; si falla, mensaje con el motivo y cero cambios — el import nunca deja la base
a medias). Es el respaldo y, además, el único camino de migración de datos si algún día la
app se empaqueta como APK: el IndexedDB de Chrome y el del WebView de un APK son bases
distintas y no se pueden leer entre sí.

---

## 4. Flujos clave

**1. Armar el semestre (una vez cada seis meses, ~10 minutos).**
Ramos → crear 4 ramos con nombre y color → entrar a cada uno → cargar sus evaluaciones en
filas inline seguidas con título y fecha → volver al mes y ver el semestre tomando forma.

**2. Consultar el mes (varias veces por semana, 3 segundos).**
Abrir la app → tab Mes → escanear: dónde hay números rojos, de qué color están cargadas las
semanas, qué días tienen 4 barras.

**3. Ver qué tengo un día (varias veces al día, 1 tap).**
Tab Hoy para el día actual, o tab Mes → tap en el día → bottom sheet con la lista.

**4. Organizar el día (cuando toca planificar, ~2 minutos).**
Vista día → mirar la franja superior → "Agendar" en la entrega del jueves → aparece el
bloque en el timeline → tap en slots vacíos para sumar bloques de estudio.

**5. Anotar algo al vuelo (todo el tiempo, ~15 segundos).**
FAB "+" desde donde estés → Compromiso → título, fecha, hora, categoría → guardar. Si se
repite, marcar recurrencia ahí mismo.

---

## 5. Dirección visual

**La regla que ordena todo: la app es gris.** Blanco, negro y cuatro grises para
superficies, bordes y texto. El color aparece **solo** en las barras del mes, en los chips
de ramo/categoría y en el rojo de importancia. Ni los tabs, ni los botones, ni los headers
llevan color. Así, cuando ves color, significa algo — y eso es lo que hace que la app se
sienta más visual que una lista de tareas sin ser decorativa: no hay más adornos, hay menos,
pero el poco color que queda es 100% información.

- **Tema:** claro único. Los colores de ramo saltan más sobre blanco. Todo el color se
  define como tokens CSS para que sumar tema oscuro después sea cambiar un archivo, no
  rediseñar.
- **Acento:** neutro. FAB negro, tab activo negro. Un azul de marca competiría con el azul
  de deporte y con el ramo que el usuario pinte de azul.
- **Paleta de datos:** set cerrado de 6-8 colores para ramos, elegidos de esa lista.
  Garantiza contraste en barras de 4px y evita dos ramos en dos azules parecidos. Categorías
  con color fijo: deporte azul, salud verde, trámite ámbar, personal violeta. **Rojo vetado**
  en ambas.
- **Tipografía:** una sola familia (Inter o la del sistema). Tres tamaños: 20px títulos de
  pantalla, 15px contenido, 12px metadatos y número del día. Un solo peso bold, reservado
  para títulos y para el rojo de importancia — si bold siempre significa "importante", no
  hay nada que aprender.
- **Espaciado:** grilla de 4px. Aire entre secciones antes que separadores. Bordes de 1px
  gris muy claro solo donde hace falta estructura: la grilla del mes y las líneas horarias.
- **Sombras:** ninguna, salvo el bottom sheet y el FAB — las dos únicas cosas que flotan de
  verdad.
- **Radios:** 8px en tarjetas y sheets, 2px en las barritas del mes.
- **Táctil:** área mínima de 44px en todo lo interactivo, aunque el elemento visible sea más
  chico.

**Estados vacíos:** una línea de texto y la acción. Nada de ilustraciones ni frases
motivacionales.

**Errores:**
- *La base no abre* (storage lleno, incógnito, versión corrupta): pantalla completa, "No se
  pudo abrir la base de datos", botón reintentar y botón exportar si se puede leer algo. Es
  el único error que bloquea la app.
- *Falla una escritura:* toast "No se pudo guardar" y el cambio se revierte en pantalla.
  Nunca dejar la UI mostrando algo que no se guardó.
- *Import inválido:* mensaje con el motivo, cero cambios en la base.

**Carga:** no hay spinners. En el arranque se muestra la shell (barra inferior + header) con
el contenido en blanco mientras se abre la base. Algo que tarde más de 150ms es un bug.

---

## 6. Fuera de alcance

**El MVP deliberadamente NO hace:**

- Notas, ponderaciones ni promedios. La importancia es un campo manual.
- Notificaciones. La app no suena ni avisa; hay que abrirla.
- Sync entre dispositivos, cuentas, backend.
- Editar una ocurrencia individual de una serie recurrente (cancelarla sí, moverla no).
- Recurrencias complejas tipo "el tercer martes del mes" (RRULE con `BYSETPOS`).
- Drag para crear o mover bloques de tiempo.
- Tema oscuro.
- Vista semana, vista agenda, búsqueda, etiquetas, adjuntos.

**Backlog (v2):**

- **Notificaciones push locales** — que el teléfono avise antes de un compromiso; requiere
  service worker y permisos.
- **APK vía Capacitor** — empaquetar la misma app web como app nativa Android. El código no
  cambia; los datos no viajan solos, y por eso el export/import está en el MVP.
- **Editar una ocurrencia individual de una serie recurrente** — requiere materializar
  ocurrencias como registros propios.
- **Drag para mover bloques** — arrastrar un bloque existente a otra hora.
- **Tema oscuro** — ya previsto vía tokens CSS.
- **Entidad `Semestre`** — si `Ramo.archivado` se queda corto.

---

## 7. Preguntas abiertas

- **Horario de clases.** Hoy los ramos no tienen horario, así que la vista día no muestra
  las clases. Si en la práctica el día se siente incompleto sin ellas, es una entidad nueva
  (`BloqueClase` recurrente por ramo) — vale la pena usar la app un mes antes de decidirlo.
- **Límites del timeline.** 07:00–23:00 es una apuesta. Si se queda corto, se vuelve
  configurable en Ajustes.
- **Categorías de compromiso.** El set fijo (salud, deporte, trámite, personal) puede quedar
  corto. Hacerlo editable es una entidad `Categoria` y una pantalla más; se decide con uso
  real.
- **Cuántos colores de ramo.** 6 u 8 en la paleta cerrada se define al elegir los valores
  concretos y verificar contraste en barras de 4px.

---

## Decisiones

- **Producto** — la app se llama PlannerMi
- **Alcance** — no es solo universidad: convive lo académico con compromisos personales
- **Alcance** — export/import JSON entra al MVP: respaldo y único camino de migración hacia un futuro APK
- **Plataforma** — mobile-first sobre Android/Chrome, PWA instalable en el MVP; Capacitor/APK cuando la app se estabilice
- **Persistencia** — se pide `navigator.storage.persist()` al primer uso para evitar desalojo de IndexedDB
- **Modelo de dominio** — entidades: `Ramo`, `Evaluacion`, `Compromiso`, `Tarea`, `BloqueTiempo`
- **Modelo de dominio** — existen tareas sueltas: `Tarea.evaluacionId` es opcional
- **Modelo de dominio** — `Compromiso` es una entidad aparte de `Evaluacion`; ambas se normalizan a `DatedItem` para el render del mes
- **Modelo de dominio** — 4 ramos por semestre; hasta ~4 ítems en un día cargado
- **Modelo de dominio** — la importancia es manual (`'alta' | 'media' | 'baja'`); notas y promedios fuera del MVP
- **Modelo de dominio** — `Compromiso.recordatorioMin?` reservado para no migrar cuando lleguen las notificaciones
- **Modelo de dominio** — recurrencia nivel Notion: frecuencia + intervalo + días de semana + fecha de término + excepciones; sin edición de ocurrencia individual
- **Modelo de dominio** — `Ramo.archivado: boolean` para separar semestres sin entidad `Semestre`
- **Modelo de dominio** — borrar en cascada ramo → evaluaciones → tareas; los `BloqueTiempo` sobreviven con el `ref` limpiado
- **Vista mes** — mes completo en pantalla, sin scroll vertical
- **Vista mes** — celda = número del día + hasta 4 barras horizontales de 4px apiladas verticalmente
- **Vista mes** — los recurrentes sí aparecen, con color estable por categoría y peso visual reducido
- **Vista mes** — tres canales separados: color = qué es, rojo = importancia alta, relleno = único vs recurrente
- **Vista mes** — la importancia alta se marca con el número del día en rojo y bold, no con borde de celda
- **Vista mes** — paleta cerrada de 6-8 colores para ramos; rojo vetado como color de ramo o categoría
- **Vista mes** — el tap en un día abre un bottom sheet con la lista; desde ahí se entra a la vista día
- **Vista día** — timeline de 07:00 a 23:00 con slots de 30 minutos
- **Vista día** — los bloques se crean con tap en slot vacío que abre un sheet con hora prellenada y 1 hora por defecto; sin drag
- **Vista día** — pantalla partida: franja superior sin hora + timeline abajo
- **Vista día** — "agendar" crea un `BloqueTiempo` con `ref` a la evaluación o tarea de origen
- **Navegación** — barra inferior con tres tabs: Mes · Hoy · Ramos; Ajustes en un engranaje del header
- **Navegación** — FAB "+" único que abre un sheet con Evaluación / Compromiso / Tarea, fecha prellenada por contexto
- **Pantalla Ramos** — lista de ramos con color y contador; el detalle permite cargar evaluaciones inline y archivar el ramo
- **Pantalla Ramos** — tareas anidadas bajo su evaluación, colapsadas por defecto; formulario de evaluación inline con título + fecha
- **Visual** — la app es gris; el color solo aparece en datos (barras, chips) y en el rojo de importancia
- **Visual** — tema claro único, con tokens CSS para sumar oscuro después
- **Visual** — acento neutro (FAB y tab activo en negro), sin color de marca
- **Visual** — una familia tipográfica, tres tamaños, un solo peso bold reservado para importancia y títulos
- **Estados** — sin spinners; la shell se muestra vacía mientras abre la base
- **Estados** — error bloqueante solo si la base no abre; escritura fallida se revierte con toast; import valida antes de tocar nada
- **Estados** — vacíos con una línea de texto y una acción, sin ilustraciones; la pantalla Ramos vacía es el onboarding

## Backlog (v2)

- **Notificaciones push locales** — que el teléfono avise antes de un compromiso; requiere service worker y permisos
- **APK vía Capacitor** — empaquetar la misma app web como app nativa Android
- **Editar una ocurrencia individual de una serie recurrente** — requiere materializar ocurrencias
- **Drag para mover bloques** — arrastrar un bloque existente a otra hora en la vista día
- **Tema oscuro** — previsto vía tokens CSS
- **Entidad `Semestre`** — si `Ramo.archivado` se queda corto
- **Horario de clases por ramo** — `BloqueClase` recurrente, para que la vista día muestre las clases
