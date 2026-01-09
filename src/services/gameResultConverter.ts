import type { Difficulty, GameResult, SubDifficulty } from '@/types/game'
import { convertFallback } from '@/services/converters/fallbackConverter'
import { convertWhackAMole } from '@/services/converters/whackAMoleConverter'

/**
 * 將各遊戲元件 `emit('game-end', rawResult)` 的原始結果，轉換成統一的 `GameResult`。
 * 目標：結算顯示/DB 入庫/報表分析都只依賴同一套欄位，避免跨遊戲指標落差造成誤判。
 */
export function convertGameEndResult(
  gameId: string,
  rawResult: unknown,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): GameResult {
  switch (gameId) {
    case 'whack-a-mole':
      return convertWhackAMole(rawResult, difficulty, subDifficulty, duration)
    default:
      return convertFallback(gameId, rawResult, difficulty, subDifficulty, duration)
  }
}

