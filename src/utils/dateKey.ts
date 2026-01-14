/**
 * Local date key utilities (YYYY-MM-DD).
 *
 * Important: Avoid using `toISOString().split('T')[0]` for "today" because it uses UTC
 * and will be off by one day around local midnight in non-UTC timezones.
 */

export function getLocalDateKey(input: Date = new Date()): string {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  // sv-SE locale returns ISO-like `YYYY-MM-DD` in local timezone.
  return d.toLocaleDateString('sv-SE')
}

export function parseLocalDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const d = new Date(year, month - 1, day)
  d.setHours(0, 0, 0, 0)
  return d
}
