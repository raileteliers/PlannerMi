import { format, parse } from 'date-fns'

/** 'YYYY-MM-DD', always local time. Never a Date, never UTC. */
export type ISODate = string
/** '14:30' */
export type HoraHHMM = string

export const ISO_DATE_FORMAT = 'yyyy-MM-dd'

/** Parse an ISODate as a local calendar day (avoids the UTC off-by-one). */
export const parseISODate = (iso: ISODate): Date =>
  parse(iso, ISO_DATE_FORMAT, new Date())

export const toISODate = (date: Date): ISODate => format(date, ISO_DATE_FORMAT)

export const todayISO = (): ISODate => toISODate(new Date())
