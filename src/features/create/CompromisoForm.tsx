import { useState } from 'react'
import { getDay } from 'date-fns'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Checkbox } from '../../components/Checkbox'
import { ChipGroup } from '../../components/ChipGroup'
import { DateInput } from '../../components/DateInput'
import { TimeInput } from '../../components/TimeInput'
import { CATEGORY_LABEL, type CategoriaCompromiso } from '../../design/palette'
import { IMPORTANCIA_LABEL } from '../../design/labels'
import { TOKENS } from '../../design/tokens'
import { formatFechaCorta } from '../../lib/dateInput'
import { parseISODate, type ISODate } from '../../lib/date'
import { parseHoraCorta } from '../../lib/time'
import { usePlannerStore } from '../../store/usePlannerStore'
import { IMPORTANCIAS, type Compromiso, type Recurrencia } from '../../model/types'
import { RecurrenceEditor } from './RecurrenceEditor'
import { recurrenciaNueva } from './recurrenceDraft'
import { CampoTitulo, FormActions } from './FormPieces'

const CATEGORIAS = Object.keys(CATEGORY_LABEL) as CategoriaCompromiso[]

export function CompromisoForm({
  fecha: fechaInicial,
  existente,
  /** The day the form was opened from, for cancelling one occurrence. */
  fechaOcurrencia,
  onClose,
}: {
  fecha: ISODate
  existente?: Compromiso
  fechaOcurrencia?: ISODate
  onClose: () => void
}) {
  const createCompromiso = usePlannerStore((s) => s.createCompromiso)
  const updateCompromiso = usePlannerStore((s) => s.updateCompromiso)
  const deleteCompromiso = usePlannerStore((s) => s.deleteCompromiso)

  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [horaTexto, setHoraTexto] = useState(existente?.hora ?? '')
  const [duracion, setDuracion] = useState(
    existente?.duracionMin === undefined ? '' : String(existente.duracionMin),
  )
  const [categoria, setCategoria] = useState<CategoriaCompromiso>(
    existente?.categoria ?? 'personal',
  )
  const [importancia, setImportancia] = useState(existente?.importancia ?? 'media')
  const [recurrencia, setRecurrencia] = useState<Recurrencia | null>(
    existente?.recurrencia ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  const hora = parseHoraCorta(horaTexto)
  const horaValida = horaTexto.trim() === '' || hora !== null

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!fecha) return setError('Revisá la fecha.')
    if (!horaValida) return setError('Revisá la hora.')

    const duracionMin = duracion.trim() === '' ? undefined : Number(duracion)

    const campos = {
      titulo: titulo.trim(),
      fecha,
      categoria,
      importancia,
      hora: hora ?? undefined,
      duracionMin,
      recurrencia: recurrencia ?? undefined,
      ...(existente?.recordatorioMin === undefined
        ? {}
        : { recordatorioMin: existente.recordatorioMin }),
    }
    const ok = existente
      ? await updateCompromiso(existente.id, campos)
      : (await createCompromiso(limpiar(campos))) !== null
    if (ok) onClose()
  }

  /** Cancelling one occurrence is an exception, not a new entity. */
  async function cancelarOcurrencia() {
    if (!existente?.recurrencia || !fechaOcurrencia) return
    const excepciones = [...existente.recurrencia.excepciones, fechaOcurrencia]
    const ok = await updateCompromiso(existente.id, {
      recurrencia: { ...existente.recurrencia, excepciones },
    })
    if (ok) onClose()
  }

  return (
    <View className="gap-3 pb-2 pt-1">
      <CampoTitulo
        value={titulo}
        onChange={(v) => {
          setTitulo(v)
          setError(null)
        }}
        placeholder="Doctor, gimnasio, trámite…"
        autoFocus={!existente}
      />

      <View className="flex-row items-end gap-4">
        <View className="flex-1">
          <DateInput
            label={recurrencia ? 'Desde' : 'Fecha'}
            value={fecha}
            onChange={setFecha}
          />
        </View>
        <TimeInput
          label="Hora (opcional)"
          value={horaTexto}
          onChange={(texto) => {
            setHoraTexto(texto)
            setError(null)
          }}
        />
      </View>

      <View className="flex-row items-center gap-2">
        <Text className="text-meta text-ink-tertiary">Dura</Text>
        <TextInput
          value={duracion}
          inputMode="numeric"
          placeholder="60"
          placeholderTextColor={TOKENS.inkTertiary}
          accessibilityLabel="Duración en minutos"
          onChangeText={(texto) => setDuracion(texto.replace(/\D/g, ''))}
          className="min-h-[44px] w-16 border-b border-border-hairline text-center text-body text-ink"
        />
        <Text className="text-meta text-ink-tertiary">min</Text>
      </View>

      <ChipGroup
        label="Categoría"
        value={categoria}
        options={CATEGORIAS}
        labels={CATEGORY_LABEL}
        onChange={setCategoria}
      />
      <ChipGroup
        label="Importancia"
        value={importancia}
        options={IMPORTANCIAS}
        labels={IMPORTANCIA_LABEL}
        onChange={setImportancia}
      />

      <View className="min-h-[44px] flex-row items-center">
        <Checkbox
          label="Se repite"
          checked={recurrencia !== null}
          onChange={(marcado) =>
            setRecurrencia(
              marcado ? recurrenciaNueva(getDay(parseISODate(fecha ?? fechaInicial))) : null,
            )
          }
        />
        <Text className="text-body text-ink">Se repite</Text>
      </View>

      {recurrencia && <RecurrenceEditor value={recurrencia} onChange={setRecurrencia} />}

      {existente?.recurrencia && fechaOcurrencia && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void cancelarOcurrencia()}
          className="min-h-[44px] justify-center"
        >
          <Text className="text-body text-ink underline">
            Cancelar solo el {formatFechaCorta(fechaOcurrencia)}
          </Text>
        </Pressable>
      )}

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteCompromiso(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
              detalleEliminar: existente.recurrencia
                ? 'Se elimina la serie completa, en todas sus fechas.'
                : undefined,
              labelEliminar: existente.recurrencia ? 'Eliminar toda la serie' : 'Eliminar',
            }
          : {})}
      />
    </View>
  )
}

/** Drop the optional keys that came out undefined instead of storing them. */
function limpiar<T extends object>(campos: T): T {
  return Object.fromEntries(
    Object.entries(campos).filter(([, valor]) => valor !== undefined),
  ) as T
}
