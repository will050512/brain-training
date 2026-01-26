export function normalizeBirthdayInput(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const isoMonthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed)
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)

  if (!isoMonthMatch && !isoDateMatch) return ''

  const yearRaw = Number((isoMonthMatch || isoDateMatch)![1])
  const monthRaw = Number((isoMonthMatch || isoDateMatch)![2])
  const dayRaw = isoDateMatch ? Number(isoDateMatch[3]) : 1

  if (!Number.isFinite(yearRaw) || !Number.isFinite(monthRaw) || !Number.isFinite(dayRaw)) return ''

  const currentYear = new Date().getFullYear()
  let year = yearRaw
  if (yearRaw < 100) {
    const currentTwoDigit = currentYear % 100
    year = (yearRaw <= currentTwoDigit ? 2000 : 1900) + yearRaw
  }

  if (year < 1900 || year > currentYear) return ''
  if (monthRaw < 1 || monthRaw > 12) return ''
  if (dayRaw < 1 || dayRaw > 31) return ''

  const month = String(monthRaw).padStart(2, '0')
  const day = String(dayRaw).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseBirthdayToDate(input: string): Date | null {
  const normalized = normalizeBirthdayInput(input)
  if (!normalized) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatBirthdayToRoc(input: string): string {
  if (!input) return ''
  const toRocYear = (adYear: number): number => Math.max(1, adYear - 1911)

  if (/^\d{4}-\d{2}$/.test(input)) {
    const year = Number(input.slice(0, 4))
    const month = Number(input.slice(5, 7))
    if (Number.isFinite(year) && Number.isFinite(month)) {
      return `民國${toRocYear(year)}年${month}月`
    }
    return input.replace('-', '/')
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const year = Number(input.slice(0, 4))
    const month = Number(input.slice(5, 7))
    if (Number.isFinite(year) && Number.isFinite(month)) {
      return `民國${toRocYear(year)}年${month}月`
    }
    return input.slice(0, 7).replace('-', '/')
  }

  const date = new Date(input)
  if (!Number.isNaN(date.valueOf())) {
    return `民國${toRocYear(date.getFullYear())}年${date.getMonth() + 1}月`
  }
  return input
}
