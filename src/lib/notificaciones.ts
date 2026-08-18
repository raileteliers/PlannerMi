import * as Notifications from 'expo-notifications'
import { LogBox, Platform } from 'react-native'
import { avisosDe } from '../logic/notifications'
import type { Dataset } from '../model/types'

/**
 * expo-notifications warns about this on import, whether or not you use push.
 * We only ever schedule local notifications, which Expo Go still delivers, so
 * the warning is noise here — and a full-screen overlay on every launch.
 * Scoped to this one message: anything else it has to say still gets through.
 */
if (__DEV__) {
  LogBox.ignoreLogs([/Android Push notifications .*removed from Expo Go/])
}

/** Show the banner even with the app open: the point is not to miss things. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const CANAL = 'recordatorios'

/**
 * Asks once. Android below 13 grants without a prompt, so a false here really
 * does mean the user said no.
 */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const actual = await Notifications.getPermissionsAsync()
  if (actual.granted) return true
  if (!actual.canAskAgain) return false

  return (await Notifications.requestPermissionsAsync()).granted
}

/**
 * Cancel everything and schedule the current set.
 *
 * Wholesale rather than diffing: the schedule is derived from the dataset, a
 * few hundred entries at most, and rebuilding it means an edit can never leave
 * a stale reminder behind. Returns how many are pending.
 */
export async function reprogramarAvisos(data: Dataset): Promise<number> {
  const avisos = avisosDe(data)

  await Notifications.cancelAllScheduledNotificationsAsync()

  for (const aviso of avisos) {
    await Notifications.scheduleNotificationAsync({
      identifier: aviso.id,
      content: { title: aviso.titulo, body: aviso.cuerpo },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: aviso.cuando,
        ...(Platform.OS === 'android' ? { channelId: CANAL } : {}),
      },
    })
  }

  return avisos.length
}
