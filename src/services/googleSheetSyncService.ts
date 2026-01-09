import type { GameSession, GameResult, StandardizedMetrics, TrackingData } from '@/types/game'
import { getUserGameSessions } from '@/services/db'

// 已部署的 Apps Script Web App
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzN1BnvG1hHI8pVZpbbZ2hcCixD4knV2pgM1yG2hAvl2a1S3E8DLxCUKe5v3KmNokra/exec'

type SheetTracking = TrackingData & {
  avgReactionTimeMs?: number
  avgThinkingTimeMs?: number
}

type SheetPayload = {
  userId: string
  sessionId: string
  gameId: string
  difficulty: string
  subDifficulty?: number
  timestamp: string
  durationSec: number
  score: number
  grade?: string
  metrics: StandardizedMetrics
  tracking: SheetTracking
  bestScore?: number
  gameSpecific?: Record<string, unknown>
  displayStats?: unknown[]
}

function ensureMetrics(result: GameResult): StandardizedMetrics {
  return result.metrics ?? {
    completion: result.totalCount > 0 ? result.correctCount / result.totalCount : 0,
    accuracy: result.accuracy,
    speed: 50,
    efficiency: 50,
  }
}

function ensureTracking(result: GameResult): TrackingData {
  return result.tracking ?? {
    correctCount: result.correctCount,
    wrongCount: Math.max(0, result.totalCount - result.correctCount),
    avgReactionTime: result.avgReactionTime,
  }
}

function mapSessionToPayload(session: GameSession, bestScore?: number): SheetPayload {
  const { result } = session
  const metrics = ensureMetrics(result)
  const tracking = ensureTracking(result)

  return {
    userId: session.odId,
    sessionId: session.id,
    gameId: result.gameId,
    difficulty: result.difficulty,
    subDifficulty: result.subDifficulty,
    timestamp: result.timestamp?.toISOString?.() ?? new Date().toISOString(),
    durationSec: Number(result.duration ?? 0),
    score: Number(result.score ?? 0),
    grade: result.grade,
    metrics,
    tracking: {
      ...tracking,
      avgReactionTimeMs: tracking.avgReactionTime,
      avgThinkingTimeMs: tracking.avgThinkingTime,
    },
    bestScore,
    gameSpecific: result.gameSpecific,
    displayStats: result.displayStats,
  }
}

async function postToSheet(payload: SheetPayload): Promise<void> {
  try {
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Failed to sync to Google Sheet', error)
  }
}

/**
 * 單筆遊戲結果即時同步（完成遊戲時呼叫）
 */
export async function syncSessionToSheet(session: GameSession, bestScore?: number): Promise<void> {
  const payload = mapSessionToPayload(session, bestScore)
  await postToSheet(payload)
}

/**
 * 舊用戶回填：把本機 IndexedDB 中所有會話同步到 Sheet
 */
export async function backfillUserSessionsToSheet(odId: string): Promise<void> {
  try {
    const sessions = await getUserGameSessions(odId)
    for (const session of sessions) {
      const payload = mapSessionToPayload(session)
      await postToSheet(payload)
    }
  } catch (error) {
    console.error('Backfill to Google Sheet failed', error)
  }
}
