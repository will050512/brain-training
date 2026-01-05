export function getTotalGamesPlayed(
  statsTotalGamesPlayed: number | null | undefined,
  sessionsCount: number | null | undefined
): number {
  if (typeof statsTotalGamesPlayed === 'number' && Number.isFinite(statsTotalGamesPlayed)) {
    return statsTotalGamesPlayed
  }

  if (typeof sessionsCount === 'number' && Number.isFinite(sessionsCount)) {
    return sessionsCount
  }

  return 0
}

// ===== Product rules (shared constants) =====

/** 完成幾場訓練後解鎖營養分析/建議（全站一致） */
export const NUTRITION_UNLOCK_REQUIRED_TRAININGS = 5

/** 月度評估提醒：距離上次評估滿幾天後提醒 */
export const ASSESSMENT_REMINDER_DAYS = 30

/** 關閉（稍後提醒）後預設延後天數，避免每天打擾 */
export const ASSESSMENT_REMINDER_SNOOZE_DAYS = 7

export function getNutritionUnlockProgress(totalGamesPlayed: number): number {
  return Math.min(Math.max(0, totalGamesPlayed), NUTRITION_UNLOCK_REQUIRED_TRAININGS)
}

export function getNutritionUnlockPercent(totalGamesPlayed: number): number {
  const progress = getNutritionUnlockProgress(totalGamesPlayed)
  return (progress / NUTRITION_UNLOCK_REQUIRED_TRAININGS) * 100
}
