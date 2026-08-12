/** Requires a secure context: localhost and HTTPS both qualify. */
export const newId = (): string => crypto.randomUUID()
