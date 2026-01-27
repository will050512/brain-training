const DEFAULT_APP_FONT_FAMILY =
  "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif"

export function getAppFontFamily(): string {
  if (typeof window === 'undefined') return DEFAULT_APP_FONT_FAMILY

  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-sans')
    .trim()

  return fontFamily || DEFAULT_APP_FONT_FAMILY
}
