const CODE_LENGTH = 6
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeTransferCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase()
}

export function isValidTransferCode(input: string): boolean {
  const normalized = normalizeTransferCode(input)
  if (normalized.length !== CODE_LENGTH) return false
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charAt(i)
    if (!CODE_CHARS.includes(ch)) return false
  }
  return true
}

export function generateTransferCode(): string {
  let result = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length)
    result += CODE_CHARS[idx]
  }
  return result
}

export function formatTransferCode(code: string): string {
  const normalized = normalizeTransferCode(code)
  return normalized
}
