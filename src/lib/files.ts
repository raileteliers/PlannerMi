import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'

/**
 * The two file operations the app makes: hand a JSON out, and read one back.
 *
 * On the web these were a Blob download and an `<input type="file">`. On a
 * phone there is no download folder to write to unasked, so exporting means
 * writing to the app's cache and opening the share sheet — the user picks
 * Drive, WhatsApp or Archivos, and the copy that matters is the one they put
 * somewhere they will find it again.
 */

/** Written to cache, not documents: once shared, the copy here is disposable. */
export async function shareJSON(filename: string, contents: string): Promise<void> {
  const file = new File(Paths.cache, filename)
  if (file.exists) file.delete()
  file.create()
  file.write(contents)

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar el respaldo',
      UTI: 'public.json',
    })
  }
}

/** `null` when the user backs out of the picker, which is not an error. */
export async function pickJSON(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  })

  if (result.canceled) return null

  const asset = result.assets[0]
  if (!asset) return null

  return new File(asset.uri).text()
}
