import { randomUUID } from 'expo-crypto'

/** Hermes has no global `crypto`, so the UUID comes from expo-crypto. */
export const newId = (): string => randomUUID()
