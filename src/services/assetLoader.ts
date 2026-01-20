export type AssetManifestEntry = {
  用途: string
  資源名稱: string
  建議檔名: string
  備用Emoji: string
}

type AssetInfo = {
  path?: string
  emoji: string
}

const ASSET_BASE = '/assets'
const manifestCache = new Map<string, AssetInfo>()
let manifestLoaded = false

async function loadManifest(): Promise<boolean> {
  if (manifestLoaded) return true
  try {
    const response = await fetch(`${ASSET_BASE}_manifest.json`, { cache: 'no-store' })
    if (!response.ok) return false
    const data = (await response.json()) as AssetManifestEntry[]
    if (!Array.isArray(data)) return false
    data.forEach(entry => {
      if (!entry?.用途) return
      const normalizedPath = entry.建議檔名
        ? `${ASSET_BASE}/${entry.建議檔名.replace(/^\/+/, '')}`
        : undefined
      manifestCache.set(entry.用途, {
        path: normalizedPath,
        emoji: entry.備用Emoji || '🎯',
      })
    })
  } catch {
    return false
  } finally {
    manifestLoaded = true
  }
  return true
}

async function checkAssetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (res.ok) return true
    const fallback = await fetch(url, { method: 'GET', cache: 'no-store' })
    return fallback.ok
  } catch {
    return false
  }
}

export async function getAssetDisplay(usage: string): Promise<AssetInfo> {
  const loaded = await loadManifest()
  if (!loaded) return { emoji: '' }
  const info = manifestCache.get(usage)
  if (!info) return { emoji: '' }
  if (!info.path) return { emoji: info.emoji }
  const exists = await checkAssetExists(info.path)
  if (!exists) return { emoji: info.emoji }
  return info
}

export async function getAssetPath(usage: string): Promise<string | null> {
  const info = await getAssetDisplay(usage)
  return info.path ?? null
}

export async function getAssetEmoji(usage: string): Promise<string> {
  const info = await getAssetDisplay(usage)
  return info.emoji
}

export async function preloadAssetManifest(): Promise<void> {
  await loadManifest()
}
