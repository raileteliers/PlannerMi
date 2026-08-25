/**
 * The same two file operations, done the way a browser does them: a Blob
 * download and an `<input type="file">`.
 *
 * A separate file rather than a `Platform.OS` branch — a guard would still
 * pull `expo-file-system` and `expo-sharing` into the web bundle, and neither
 * has anything to run there.
 */

/** No share sheet on the web: the browser's download is the share sheet. */
export function shareJSON(filename: string, contents: string): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([contents], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Freed on the next tick: revoking before the click is handled cancels it.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return Promise.resolve()
}

/**
 * `null` when the user backs out of the picker, which is not an error.
 *
 * There is no cancel event on `<input type="file">` in every browser, so the
 * promise also settles on `cancel` where it exists and is left to be garbage
 * collected where it does not — the user can always press the button again.
 */
export function pickJSON(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'

    input.addEventListener('cancel', () => {
      input.remove()
      resolve(null)
    })

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) {
        resolve(null)
        return
      }
      file.text().then(resolve, reject)
    })

    input.style.display = 'none'
    document.body.appendChild(input)
    input.click()
  })
}
