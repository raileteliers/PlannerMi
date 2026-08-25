import type { Dataset } from '../model/types'

/**
 * The web has no local notifications worth the name: the Notification API
 * fires only while a tab is open, and scheduling ahead needs a service worker
 * with push, which needs a server. So the web build says it has no permission
 * and schedules nothing.
 *
 * `useAvisos` needs no branch of its own — it already stops when the permission
 * is false. Reminders stay a phone feature; the web is for looking and editing.
 */
export const pedirPermisoNotificaciones = (): Promise<boolean> =>
  Promise.resolve(false)

export const reprogramarAvisos = (_data: Dataset): Promise<number> =>
  Promise.resolve(0)
