import type { Session } from '@supabase/supabase-js'
import { supabase } from '../auth/client'
import { openMemoryStorage } from './memory'
import { openSupabaseStorage } from './supabase'
import type { PlannerStorage } from './storage'

/**
 * Which database the browser talks to.
 *
 * Signed in, it is Supabase directly — no local copy, no sync to run. Signed
 * out it is memory: the data lives as long as the tab, and export/import still
 * work.
 *
 * Deliberately never expo-sqlite. Its web build needs SharedArrayBuffer over
 * OPFS, which needs COOP/COEP response headers, which GitHub Pages does not
 * let anyone set.
 */
export function createStorage(
  session: Session | null,
  // The browser reads straight from the server, so there is no pull to notify
  // about. Accepted so both platforms are called the same way.
  _alCambiar?: () => void,
): Promise<PlannerStorage> {
  const client = supabase()

  if (!session || !client) return Promise.resolve(openMemoryStorage())

  return Promise.resolve(openSupabaseStorage(client, session.user.id))
}

export type { PlannerStorage } from './storage'
