import { useRef, useState } from 'react'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { ChipGroup } from '../../src/components/ChipGroup'
import { Checkbox } from '../../src/components/Checkbox'
import { ColorPicker } from '../../src/components/ColorPicker'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'
import { TOKENS } from '../../src/design/tokens'
import {
  formatFechaCorta,
  formatFechaEditable,
  parseFechaCorta,
} from '../../src/lib/dateInput'
import { usePlannerStore } from '../../src/store/usePlannerStore'
import {
  evaluacionesDeRamo,
  ramoById,
  tareasDeEvaluacion,
} from '../../src/store/selectors'
import type { DeletePlan } from '../../src/logic/cascade'
import {
  IMPORTANCIAS,
  TIPOS_EVALUACION,
  type Evaluacion,
  type Ramo,
} from '../../src/model/types'
import { IMPORTANCIA_LABEL, TIPO_LABEL } from '../../src/design/labels'

/**
 * A fixed-size box with centred text needs all three of these on Android, or
 * the digits sit off-centre: the EditText brings its own padding, and
 * includeFontPadding pads the line asymmetrically above and below.
 */
const CAJA_FECHA = {
  padding: 0,
  includeFontPadding: false,
  textAlignVertical: 'center',
} as const

export default function CourseDetailPage() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>()
  const data = usePlannerStore((s) => s.data)
  const ramo = ramoById(data, id)

  if (!ramo) {
    return (
      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-body text-ink-secondary">Ese ramo ya no existe.</Text>
        <Link href="/ramos" className="text-body text-ink underline">
          Volver a Ramos
        </Link>
      </View>
    )
  }

  return <DetalleRamo ramo={ramo} />
}

function DetalleRamo({ ramo }: { ramo: Ramo }) {
  const data = usePlannerStore((s) => s.data)
  const updateRamo = usePlannerStore((s) => s.updateRamo)
  const deleteRamo = usePlannerStore((s) => s.deleteRamo)
  const planDeleteRamo = usePlannerStore((s) => s.planDeleteRamo)
  const router = useRouter()

  const [confirmando, setConfirmando] = useState(false)
  const evaluaciones = evaluacionesDeRamo(data, ramo.id)

  async function eliminar() {
    setConfirmando(false)
    const ok = await deleteRamo(ramo.id)
    if (ok) router.replace('/ramos')
  }

  return (
    <ScrollView className="px-4" keyboardShouldPersistTaps="handled">
      <Link href="/ramos" className="min-h-[44px] text-meta text-ink-secondary">
        ← Ramos
      </Link>

      <CampoTexto
        value={ramo.nombre}
        onSave={(nombre) => void updateRamo(ramo.id, { nombre })}
        className="min-h-[44px] text-title font-bold text-ink"
        label="Nombre del ramo"
      />
      <CampoTexto
        value={ramo.sigla ?? ''}
        placeholder="Sigla"
        onSave={(sigla) => void updateRamo(ramo.id, { sigla: sigla || undefined })}
        className="min-h-[44px] text-meta text-ink-secondary"
        label="Sigla del ramo"
      />

      <View className="mt-2">
        <ColorPicker
          value={ramo.color}
          onChange={(color) => void updateRamo(ramo.id, { color })}
        />
      </View>

      <View className="mt-4">
        {evaluaciones.map((evaluacion) => (
          <EvaluacionRow key={evaluacion.id} evaluacion={evaluacion} />
        ))}
      </View>

      <NuevaEvaluacionRow ramoId={ramo.id} autoFocus={evaluaciones.length === 0} />

      <View className="mt-10 gap-1">
        <Pressable
          accessibilityRole="button"
          onPress={() => void updateRamo(ramo.id, { archivado: !ramo.archivado })}
          className="min-h-[44px] justify-center"
        >
          <Text className="text-body text-ink">
            {ramo.archivado ? 'Desarchivar ramo' : 'Archivar ramo'}
          </Text>
        </Pressable>
        <Text className="text-meta text-ink-secondary">
          Un ramo archivado desaparece del mes y del día, pero conserva sus datos.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmando(true)}
          className="mt-4 min-h-[44px] justify-center"
        >
          <Text className="text-body text-importance">Eliminar ramo</Text>
        </Pressable>
      </View>

      {/* The FAB floats over this lane. */}
      <View className="h-20" />

      {confirmando && (
        <ConfirmDialog
          titulo={`¿Eliminar ${ramo.nombre}?`}
          detalle={detalleBorrado(planDeleteRamo(ramo.id))}
          onConfirm={() => void eliminar()}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </ScrollView>
  )
}

/** The confirmation carries the concrete numbers, never "esto y lo asociado". */
function detalleBorrado(plan: DeletePlan): string {
  const partes: string[] = []
  const { evaluacionIds, tareaIds, bloquesDesvinculados } = plan
  if (evaluacionIds.length > 0) {
    // "evaluación" loses its accent in the plural: not a suffix job.
    partes.push(
      `${evaluacionIds.length} ${evaluacionIds.length === 1 ? 'evaluación' : 'evaluaciones'}`,
    )
  }
  if (tareaIds.length > 0) {
    partes.push(`${tareaIds.length} tarea${tareaIds.length === 1 ? '' : 's'}`)
  }

  const borrado =
    partes.length === 0
      ? 'No tiene evaluaciones ni tareas.'
      : `Se eliminarán ${partes.join(' y ')}.`

  const bloques = bloquesDesvinculados.length
  if (bloques === 0) return borrado
  return `${borrado} ${bloques === 1 ? 'Un bloque queda' : `${bloques} bloques quedan`} en tu día, sin el vínculo.`
}

/** Collapsed by default: date, title, and the type. Tap to open. */
function EvaluacionRow({ evaluacion }: { evaluacion: Evaluacion }) {
  const [abierta, setAbierta] = useState(false)
  const data = usePlannerStore((s) => s.data)
  const tareas = tareasDeEvaluacion(data, evaluacion.id)
  const pendientes = tareas.filter((t) => !t.hecha).length
  const alta = evaluacion.importancia === 'alta'

  return (
    <View className="border-b border-border-hairline">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        onPress={() => setAbierta((v) => !v)}
        className="min-h-[52px] flex-row items-center gap-3"
      >
        <Text
          className={`w-24 text-meta ${
            alta ? 'font-bold text-importance' : 'text-ink-secondary'
          }`}
        >
          {formatFechaCorta(evaluacion.fecha)}
        </Text>
        <Text numberOfLines={1} className="flex-1 text-body text-ink">
          {evaluacion.titulo}
        </Text>
        {tareas.length > 0 && (
          <Text className="text-meta text-ink-tertiary">
            {pendientes}/{tareas.length}
          </Text>
        )}
        <Text className="text-meta text-ink-tertiary">{TIPO_LABEL[evaluacion.tipo]}</Text>
      </Pressable>

      {abierta && <EvaluacionEditor evaluacion={evaluacion} />}
    </View>
  )
}

/** Everything the quick row left out, edited a tap at a time. */
function EvaluacionEditor({ evaluacion }: { evaluacion: Evaluacion }) {
  const updateEvaluacion = usePlannerStore((s) => s.updateEvaluacion)
  const deleteEvaluacion = usePlannerStore((s) => s.deleteEvaluacion)
  const planDeleteEvaluacion = usePlannerStore((s) => s.planDeleteEvaluacion)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <View className="pb-4 pl-24">
      <View className="gap-3">
        {/* The collapsed row shows the title; here is where it changes. */}
        <CampoTexto
          value={evaluacion.titulo}
          onSave={(titulo) => void updateEvaluacion(evaluacion.id, { titulo })}
          className="min-h-[44px] text-body text-ink"
          label="Título de la evaluación"
          requerido
        />
        <ChipGroup
          label="Tipo"
          value={evaluacion.tipo}
          options={TIPOS_EVALUACION}
          labels={TIPO_LABEL}
          onChange={(tipo) => void updateEvaluacion(evaluacion.id, { tipo })}
        />
        <ChipGroup
          label="Importancia"
          value={evaluacion.importancia}
          options={IMPORTANCIAS}
          labels={IMPORTANCIA_LABEL}
          onChange={(importancia) => void updateEvaluacion(evaluacion.id, { importancia })}
        />
        <CampoTexto
          value={evaluacion.descripcion ?? ''}
          placeholder="Descripción"
          onSave={(descripcion) =>
            void updateEvaluacion(evaluacion.id, { descripcion: descripcion || undefined })
          }
          className="min-h-[44px] text-body text-ink"
          label="Descripción"
        />
        <CampoFecha
          value={evaluacion.fecha}
          onSave={(fecha) => void updateEvaluacion(evaluacion.id, { fecha })}
        />
      </View>

      <TareasDeEvaluacion evaluacionId={evaluacion.id} />

      <Pressable
        accessibilityRole="button"
        onPress={() => setConfirmando(true)}
        className="mt-2 min-h-[44px] justify-center"
      >
        <Text className="text-meta text-importance">Eliminar evaluación</Text>
      </Pressable>

      {confirmando && (
        <ConfirmDialog
          titulo={`¿Eliminar ${evaluacion.titulo}?`}
          detalle={detalleBorrado(planDeleteEvaluacion(evaluacion.id))}
          onConfirm={() => {
            setConfirmando(false)
            void deleteEvaluacion(evaluacion.id)
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </View>
  )
}

function TareasDeEvaluacion({ evaluacionId }: { evaluacionId: string }) {
  const data = usePlannerStore((s) => s.data)
  const createTarea = usePlannerStore((s) => s.createTarea)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const deleteTarea = usePlannerStore((s) => s.deleteTarea)
  const [titulo, setTitulo] = useState('')
  const tareas = tareasDeEvaluacion(data, evaluacionId)

  async function guardar() {
    const limpio = titulo.trim()
    if (limpio === '') return
    // Cleared before the write, so fast typing cannot pile the next task
    // on top of this one.
    setTitulo('')

    const creada = await createTarea({ titulo: limpio, evaluacionId, hecha: false })
    if (!creada) setTitulo(limpio)
  }

  return (
    <View className="mt-2">
      {tareas.map((tarea) => (
        <View key={tarea.id} className="flex-row items-center gap-2">
          <Checkbox
            label={tarea.titulo}
            checked={tarea.hecha}
            onChange={(hecha) => void updateTarea(tarea.id, { hecha })}
          />
          <CampoTexto
            value={tarea.titulo}
            onSave={(titulo) => void updateTarea(tarea.id, { titulo })}
            className={`min-h-[44px] flex-1 text-body ${
              tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
            }`}
            label={`Título de la tarea ${tarea.titulo}`}
            requerido
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar tarea ${tarea.titulo}`}
            onPress={() => void deleteTarea(tarea.id)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-meta text-ink-tertiary">✕</Text>
          </Pressable>
        </View>
      ))}

      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        onSubmitEditing={() => void guardar()}
        onBlur={() => void guardar()}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder="Nueva tarea"
        placeholderTextColor={TOKENS.inkTertiary}
        accessibilityLabel="Nueva tarea"
        className="min-h-[44px] text-body text-ink"
      />
    </View>
  )
}

/**
 * The row that makes loading a semester fast: title, date, save, next.
 * Return on the title jumps to the date; return on the date saves and comes
 * back to the title, so a whole semester is one uninterrupted run — and the
 * ↵ button does the same for a thumb that cannot reach a return key.
 *
 * Type, importance and description open up as soon as the row is in use, so
 * an evaluación can be finished in one pass instead of being refined later.
 */
function NuevaEvaluacionRow({ ramoId, autoFocus }: { ramoId: string; autoFocus: boolean }) {
  const createEvaluacion = usePlannerStore((s) => s.createEvaluacion)
  const [titulo, setTitulo] = useState('')
  const [fechaTexto, setFechaTexto] = useState('')
  const [tipo, setTipo] = useState<Evaluacion['tipo']>('prueba')
  const [importancia, setImportancia] = useState<Evaluacion['importancia']>('media')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState(false)
  const [enfocado, setEnfocado] = useState(autoFocus)
  const tituloRef = useRef<TextInput>(null)
  const fechaRef = useRef<TextInput>(null)

  const vacio = titulo === '' && fechaTexto === '' && descripcion === ''
  // Open while anything is typed or a field holds the cursor, folded back
  // when the row is left empty. Derived rather than tracked: React Native has
  // no focus bubbling to hang a container's onFocus/onBlur off.
  const enUso = enfocado || !vacio

  /** A blur followed by a focus inside the row must not fold it shut. */
  function soltarFoco() {
    setTimeout(() => setEnfocado(false), 0)
  }

  async function guardar() {
    const limpio = titulo.trim()
    const detalle = descripcion.trim()
    const fecha = parseFechaCorta(fechaTexto)
    if (limpio === '' || fecha === null) {
      setError(fechaTexto.trim() !== '' && fecha === null)
      return
    }

    setTitulo('')
    setFechaTexto('')
    setDescripcion('')
    setError(false)
    tituloRef.current?.focus()

    // Tipo carries over — a semester is usually runs of the same kind — but
    // importancia resets. A sticky "alta" paints red day numbers in the month
    // for evaluaciones nobody marked, and red is the one channel that has to
    // stay expensive.
    setImportancia('media')

    const creada = await createEvaluacion({
      ramoId,
      titulo: limpio,
      fecha,
      tipo,
      importancia,
      ...(detalle === '' ? {} : { descripcion: detalle }),
    })
    if (!creada) {
      setTitulo(limpio)
      setFechaTexto(fechaTexto)
      setDescripcion(detalle)
    }
  }

  return (
    // pr-14 keeps the ↵ out of the floating FAB's corner: two buttons in the
    // same 44px would mean the wrong one wins.
    <View className="gap-2 border-b border-border-hairline py-2 pr-14">
      <View className="flex-row items-center gap-2">
        <TextInput
          ref={tituloRef}
          value={titulo}
          autoFocus={autoFocus}
          onChangeText={setTitulo}
          onFocus={() => setEnfocado(true)}
          onBlur={soltarFoco}
          onSubmitEditing={() => fechaRef.current?.focus()}
          submitBehavior="submit"
          returnKeyType="next"
          placeholder="Nueva evaluación"
          placeholderTextColor={TOKENS.inkTertiary}
          accessibilityLabel="Título de la nueva evaluación"
          className="min-h-[44px] flex-1 text-body text-ink"
        />

        {/* A box, so it reads as a field to fill and not as a stray number. */}
        <TextInput
          ref={fechaRef}
          value={fechaTexto}
          // "numeric" is a bare digit pad on Android: no separator key at all.
          inputMode="decimal"
          onChangeText={(texto) => {
            setFechaTexto(texto)
            setError(false)
          }}
          onFocus={() => setEnfocado(true)}
          onBlur={soltarFoco}
          onSubmitEditing={() => void guardar()}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="1209"
          placeholderTextColor={TOKENS.inkTertiary}
          accessibilityLabel="Fecha de la nueva evaluación"
          style={CAJA_FECHA}
          className={`h-11 w-16 rounded-card border text-center text-body ${
            error ? 'border-importance text-importance' : 'border-border-strong text-ink'
          }`}
        />

        {/* The keyboard's return key does this too; a phone needs the button. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar evaluación"
          onPress={() => void guardar()}
          className="h-11 w-11 items-center justify-center rounded-card bg-accent"
        >
          <Text className="text-body text-on-accent">↵</Text>
        </Pressable>
      </View>

      {enUso && (
        <View className="gap-2">
          <ChipGroup
            label="Tipo"
            value={tipo}
            options={TIPOS_EVALUACION}
            labels={TIPO_LABEL}
            onChange={setTipo}
          />
          <ChipGroup
            label="Importancia"
            value={importancia}
            options={IMPORTANCIAS}
            labels={IMPORTANCIA_LABEL}
            onChange={setImportancia}
          />
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            onFocus={() => setEnfocado(true)}
            onBlur={soltarFoco}
            onSubmitEditing={() => void guardar()}
            placeholder="Descripción (opcional)"
            placeholderTextColor={TOKENS.inkTertiary}
            accessibilityLabel="Descripción de la nueva evaluación"
            className="min-h-[44px] text-body text-ink"
          />
        </View>
      )}
    </View>
  )
}

/**
 * Edit in place: saves on blur and on return.
 *
 * The web version also reverted on Escape. A phone keyboard has no Escape,
 * so the way back from a bad edit is to type the old value again — which is
 * why nothing here destroys more than the one field being edited.
 *
 * `requerido` is for the fields that name something: leaving one empty puts
 * the old name back instead of saving a blank, because a row with no name is
 * a row you can no longer find.
 */
function CampoTexto({
  value,
  onSave,
  className,
  placeholder,
  label,
  requerido = false,
}: {
  value: string
  onSave: (value: string) => void
  className: string
  placeholder?: string
  label: string
  requerido?: boolean
}) {
  const [texto, setTexto] = useState(value)
  const [editando, setEditando] = useState(false)

  // While not editing, follow the store (another screen may have changed it).
  const mostrado = editando ? texto : value

  return (
    <TextInput
      value={mostrado}
      placeholder={placeholder}
      placeholderTextColor={TOKENS.inkTertiary}
      accessibilityLabel={label}
      className={className}
      returnKeyType="done"
      onFocus={() => {
        setTexto(value)
        setEditando(true)
      }}
      onChangeText={setTexto}
      onBlur={() => {
        setEditando(false)
        const limpio = texto.trim()
        if (requerido && limpio === '') return
        if (limpio !== value) onSave(limpio)
      }}
    />
  )
}

/** Same idea, parsing "12/9" and refusing to save what it cannot read. */
function CampoFecha({ value, onSave }: { value: string; onSave: (fecha: string) => void }) {
  const [texto, setTexto] = useState(() => formatFechaEditable(value))
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState(false)

  return (
    <TextInput
      value={editando ? texto : formatFechaEditable(value)}
      inputMode="decimal"
      accessibilityLabel="Fecha"
      returnKeyType="done"
      style={CAJA_FECHA}
      className={`h-11 w-16 rounded-card border text-center text-body ${
        error ? 'border-importance text-importance' : 'border-border-strong text-ink'
      }`}
      onFocus={() => {
        setTexto(formatFechaEditable(value))
        setEditando(true)
      }}
      onChangeText={(siguiente) => {
        setTexto(siguiente)
        setError(false)
      }}
      onBlur={() => {
        setEditando(false)
        const fecha = parseFechaCorta(texto)
        if (fecha === null) {
          setError(true)
          return
        }
        if (fecha !== value) onSave(fecha)
      }}
    />
  )
}
