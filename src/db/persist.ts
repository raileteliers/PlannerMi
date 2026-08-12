/**
 * Ask Chrome not to evict the database. Best effort: a refusal is not an
 * error the user can act on, so it is never surfaced.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
