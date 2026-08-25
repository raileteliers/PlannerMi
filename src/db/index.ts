import type { Session } from '@supabase/supabase-js'
import { supabase } from '../auth/client'
import { openPlannerDB, sqliteStorage } from './sqlite'
import { openSupabaseStorage } from './supabase'
import { openSyncedStorage } from './synced'
import type { PlannerStorage } from './storage'

/**
 * Which database the phone talks to.
 *
 * Always the local SQLite file underneath, because the app has to work with no
 * signal. A session only adds a layer: writes still land locally first and are
 * pushed after. Signing in gains sync without giving up the offline app.
 */
export async function createStorage(
  session: Session | null,
  alCambiar?: () => void,
): Promise<PlannerStorage> {
  const db = await openPlannerDB()
  const client = supabase()

  // The outbox is only worth filling when there is somewhere to drain it to;
  // signed out, this is the app exactly as it was before any of this.
  if (!session || !client) return sqliteStorage(db)

  return openSyncedStorage(
    sqliteStorage(db, true),
    openSupabaseStorage(client, session.user.id),
    { alCambiar },
  )
}

export type { PlannerStorage } from './storage'
