import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Caret } from '../../components/Caret'
import { Checkbox } from '../../components/Checkbox'
import { DragList } from '../../components/DragList'
import { courseColor } from '../../design/palette'
import { RECURRING_ALPHA } from '../../design/tokens'
import { parseISODate, type ISODate } from '../../lib/date'
import {
  SIN_FECHA_VISIBLES,
  diaVacio,
  resumenDelDia,
  type DiaDeSemana,
} from '../../logic/weekItems'
import { moverADia, reordenar } from '../../logic/taskOrder'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ZonasProvider, useZonas } from './dropZones'
import type { Tarea } from '../../model/types'

/**
 * The height of a task row, which the drag needs as a number to work out where
 * a drop landed.
 *
 * 44 and not 36: the drag grip carries the app's usual 44px touch target, and
 * that is what actually sets the row's height. A number here that disagrees
 * with the rendered row silently lands every drop one row short.
 */
const ALTURA_TAREA_PX = 44

/**
 * Only the pending ones can be dragged.
 *
 * Done tasks sort below every pending one, so a row dropped past them would
 * spring back the moment it landed — the list would be arguing with the drop
 * instead of obeying it.
 */
function TareasArrastrables({
  tareas,
  fecha,
  onEditar,
}: {
  tareas: Tarea[]
  /** The day these belong to. `undefined` is the loose pile. */
  fecha: ISODate | undefined
  onEditar: (tarea: Tarea) => void
}) {
  const data = usePlannerStore((s) => s.data)
  const reordenarTareas = usePlannerStore((s) => s.reordenarTareas)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const zonas = useZonas()

  const pendientes = tareas.filter((t) => !t.hecha)
  const hechas = tareas.filter((t) => t.hecha)

  /**
   * A drop lands on a day, and the day it lands on decides what happened: the
   * same one means "put it here in the list", another one means "do it then
   * instead". One gesture, two meanings, told apart by where you let go.
   */
  const soltarEn = (tarea: Tarea, x: number, y: number): boolean => {
    const zona = zonas?.zonaEn(x, y)
    zonas?.limpiar()
    if (!zona || zona.fecha === fecha) return false

    const enDestino = data.tareas.filter((t) => t.fecha === zona.fecha && t.id !== tarea.id)
    void updateTarea(tarea.id, moverADia(enDestino, zona.fecha))
    return true
  }

  // One task still gets a grip: it has nowhere to go inside its own day, but
  // moving it to another day is the whole point.
  const arrastrables = zonas ? pendientes : pendientes.length > 1 ? pendientes : []

  return (
    <>
      {arrastrables.length > 0 ? (
        <DragList
          items={arrastrables}
          alturaFila={ALTURA_TAREA_PX}
          onReordenar={(desde, hasta) =>
            void reordenarTareas(reordenar(arrastrables, desde, hasta))
          }
          {...(zonas
            ? {
                onArrastreInicio: zonas.medir,
                onArrastreMover: (x: number, y: number) =>
                  zonas.setActiva(zonas.zonaEn(x, y)?.clave ?? null),
                onSoltarEn: soltarEn,
              }
            : {})}
          renderItem={(tarea) => <TareaFila tarea={tarea} onEditar={onEditar} />}
        />
      ) : (
        pendientes.map((tarea) => (
          <TareaFila key={tarea.id} tarea={tarea} onEditar={onEditar} />
        ))
      )}

      {hechas.map((tarea) => (
        <TareaFila key={tarea.id} tarea={tarea} onEditar={onEditar} />
      ))}
    </>
  )
}

/**
 * The week as seven stacked days, each one carrying what is scheduled and
 * what there is to do.
 *
 * Rows rather than columns: seven columns on a phone are 50px wide, and a
 * task title in 50px is not a task title. On a wide screen the same rows are
 * laid side by side, which is where seven columns finally fit.
 */
export function WeekList({
  dias,
  sinFecha,
  hoy,
  enColumnas,
  onSelectDay,
  onEditarTarea,
  onDiaEnFoco,
}: {
  dias: DiaDeSemana[]
  sinFecha: Tarea[]
  hoy: ISODate
  enColumnas: boolean
  onSelectDay: (fecha: ISODate) => void
  onEditarTarea: (tarea: Tarea) => void
  /** The day being looked at, which is the one the global "+" fills in. */
  onDiaEnFoco: (fecha: ISODate) => void
}) {
  /**
   * Which days are open. A set and not one date: this screen exists to compare
   * days, and opening one cannot close the one you were comparing it against —
   * the same reason Carga is not an accordion.
   *
   * Keyed by date, so moving to another week starts folded again.
   */
  const [abiertos, setAbiertos] = useState<ReadonlySet<ISODate>>(() => new Set())

  const alternar = (fecha: ISODate) => {
    onDiaEnFoco(fecha)
    setAbiertos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(fecha)) siguiente.delete(fecha)
      else siguiente.add(fecha)
      return siguiente
    })
  }
  // Above the seven days in both layouts: the strip belongs to the week, not
  // to any one day, and it is the pile you deal the week out of.
  const strip = <SinFechaStrip tareas={sinFecha} onEditar={onEditarTarea} />

  if (enColumnas) {
    return (
      <ZonasProvider>
      <View className="min-h-0 flex-1">
        {strip}
        <View className="min-h-0 flex-1 flex-row border-l border-t border-border-hairline">
          {dias.map((dia) => (
            <Zona
              key={dia.fecha}
              clave={dia.fecha}
              fecha={dia.fecha}
              className="min-w-0 flex-1 border-b border-r border-border-hairline"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <DiaFila
                  dia={dia}
                  esHoy={dia.fecha === hoy}
                  angosto
                  onSelect={onSelectDay}
                  onEditarTarea={onEditarTarea}
                />
              </ScrollView>
            </Zona>
          ))}
        </View>
      </View>
      </ZonasProvider>
    )
  }

  return (
    <ZonasProvider>
      <ScrollView className="min-h-0 flex-1" showsVerticalScrollIndicator={false}>
        {strip}
        {dias.map((dia) => (
          <Zona
            key={dia.fecha}
            clave={dia.fecha}
            fecha={dia.fecha}
            className="border-b border-border-hairline"
          >
            <DiaFila
              dia={dia}
              esHoy={dia.fecha === hoy}
              abierto={abiertos.has(dia.fecha)}
              onAlternar={() => alternar(dia.fecha)}
              onSelect={onSelectDay}
              onEditarTarea={onEditarTarea}
            />
          </Zona>
        ))}
        {/* The FAB floats over this lane, so Sunday is never under it. */}
        <View className="h-14" />
      </ScrollView>
    </ZonasProvider>
  )
}

/**
 * A day, as a place a task can be dropped on.
 *
 * It registers its node so the week can measure where it is on screen, and
 * lights up while a task is held over it — without that, a cross-day drag is
 * letting go and hoping.
 */
function Zona({
  clave,
  fecha,
  className,
  children,
}: {
  clave: string
  fecha: ISODate | undefined
  className: string
  children: ReactNode
}) {
  const zonas = useZonas()
  const activa = zonas?.activa === clave

  return (
    <View
      ref={(nodo) => zonas?.registrar(clave, fecha, nodo)}
      className={`${className} ${activa ? 'bg-surface-muted' : ''}`}
    >
      {children}
    </View>
  )
}

/**
 * The undated tasks, folded to two.
 *
 * Folded rather than scrolling with the rest because this strip is not the
 * screen: a long pile of loose tasks would push Monday off the top every time
 * the week is opened, and the week is what you came to see.
 *
 * The mark to open it is the caret and not a "+": in this app the "+" is the
 * button that creates things, and it is floating on this very screen.
 */
function SinFechaStrip({
  tareas,
  onEditar,
}: {
  tareas: Tarea[]
  onEditar: (tarea: Tarea) => void
}) {
  const [abierto, setAbierto] = useState(false)

  // No empty box: with nothing loose there is nothing to say.
  if (tareas.length === 0) return null

  const visibles = abierto ? tareas : tareas.slice(0, SIN_FECHA_VISIBLES)
  const ocultas = tareas.length - visibles.length

  return (
    // A zone like the days are: dragging something out of the week and into
    // this pile is how you say "not this week, but not gone either".
    <Zona clave="sin-fecha" fecha={undefined} className="border-b border-border-hairline px-2 py-2">
      <Text className="text-meta uppercase text-ink-tertiary">Sin fecha</Text>

      <TareasArrastrables tareas={visibles} fecha={undefined} onEditar={onEditar} />

      {(ocultas > 0 || abierto) && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto }}
          onPress={() => setAbierto((v) => !v)}
          className="min-h-[36px] flex-row items-center gap-2 pl-2"
        >
          <Caret abierto={abierto} />
          <Text className="text-meta text-ink-tertiary">
            {abierto ? 'Ver menos' : `${ocultas} más`}
          </Text>
        </Pressable>
      )}
    </Zona>
  )
}

function DiaFila({
  dia,
  esHoy,
  angosto = false,
  abierto,
  onAlternar,
  onSelect,
  onEditarTarea,
}: {
  dia: DiaDeSemana
  esHoy: boolean
  /** A column, not a row: there is no width to put an hour beside a title. */
  angosto?: boolean
  /**
   * Folded or not. Absent as columns, where the seven days are already side by
   * side and folding one would buy nothing.
   */
  abierto?: boolean
  onAlternar?: () => void
  onSelect: (fecha: ISODate) => void
  onEditarTarea: (tarea: Tarea) => void
}) {
  const vacio = diaVacio(dia)
  const plegable = onAlternar !== undefined && !vacio
  // An empty day has nothing to fold away, so it never draws a caret and never
  // hides anything — the same rule Carga uses for a ramo with one evaluación.
  const mostrarContenido = !plegable || abierto === true

  return (
    <View className={`px-2 py-2 ${esHoy ? 'bg-surface-muted' : ''}`}>
      {/* The header is the way in: tapping the day opens it, which is also
          the only way to add something to an empty one. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={plegable ? { expanded: abierto === true } : undefined}
        accessibilityLabel={format(parseISODate(dia.fecha), "EEEE d 'de' MMMM", { locale: es })}
        onPress={plegable ? onAlternar : () => onSelect(dia.fecha)}
        className="min-h-[44px] flex-row items-center gap-2"
      >
        <Text className={`text-meta uppercase ${esHoy ? 'font-bold text-ink' : 'text-ink-secondary'}`}>
          {format(parseISODate(dia.fecha), 'EEE d', { locale: es }).replace('.', '')}
        </Text>
        {/* One line, not two words sitting next to each other: "hoy libre"
            reads as a phrase that means neither of the two things it says. */}
        {(esHoy || (vacio && !angosto)) && (
          <Text className="text-meta text-ink-tertiary">
            {[esHoy ? 'hoy' : null, vacio && !angosto ? 'libre' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}

        {/* Folded, the day still says what it holds. Seven bare dates would
            mean opening each one to find out whether it has anything in it. */}
        {plegable && !abierto && (
          <Text numberOfLines={1} className="min-w-0 flex-1 text-meta text-ink-tertiary">
            {resumenDelDia(dia)}
          </Text>
        )}

        {plegable && (
          <View className="ml-auto">
            <Caret abierto={abierto === true} />
          </View>
        )}
      </Pressable>

      {mostrarContenido &&
        dia.items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => onSelect(dia.fecha)}
          className="min-h-[28px] flex-row items-start gap-2 pl-1"
        >
          <View
            className="mt-1 h-4 w-1 rounded-bar"
            style={{
              backgroundColor: courseColor(item.color),
              // Reduced weight, not hidden: routine still takes up your day.
              opacity: item.esRecurrente ? RECURRING_ALPHA : 1,
            }}
          />
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className={`text-meta ${
                item.importancia === 'alta' ? 'font-bold text-importance' : 'text-ink'
              }`}
            >
              {item.titulo}
            </Text>
            {/* In a column the hour goes under the title. Beside it, it wins
                the row and the title is squeezed down to nothing. */}
            {angosto && item.hora !== undefined && (
              <Text className="text-meta text-ink-tertiary">{item.hora}</Text>
            )}
          </View>
            {!angosto && item.hora !== undefined && (
              <Text className="shrink-0 text-meta text-ink-tertiary">{item.hora}</Text>
            )}
          </Pressable>
        ))}

      {mostrarContenido && (
        <TareasArrastrables tareas={dia.tareas} fecha={dia.fecha} onEditar={onEditarTarea} />
      )}
    </View>
  )
}

/**
 * The row is split in two, the way the day sheet splits it: the box closes the
 * task, the title opens it.
 *
 * Checking off is done right here rather than through the day sheet, because
 * reviewing the week and closing what is already done is one gesture. Opening
 * the title is what turns this screen from a list into a way of organizing:
 * a loose task gets its day in the form behind it.
 */
function TareaFila({ tarea, onEditar }: { tarea: Tarea; onEditar: (tarea: Tarea) => void }) {
  const updateTarea = usePlannerStore((s) => s.updateTarea)

  return (
    <View className="min-h-[44px] flex-row items-center">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarea.hecha }}
        accessibilityLabel={tarea.titulo}
        onPress={() => void updateTarea(tarea.id, { hecha: !tarea.hecha })}
        className="h-9 w-8 items-center justify-center overflow-hidden"
      >
        {/* The shared Checkbox is used for its drawing: its own 44px target is
            clipped, and this Pressable is the target instead. */}
        <View pointerEvents="none">
          <Checkbox checked={tarea.hecha} onChange={() => {}} label={tarea.titulo} />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${tarea.titulo}`}
        onPress={() => onEditar(tarea)}
        className="h-9 min-w-0 flex-1 justify-center"
      >
        <Text
          numberOfLines={1}
          className={`text-meta ${
            tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
          }`}
        >
          {tarea.titulo}
        </Text>
      </Pressable>
    </View>
  )
}
