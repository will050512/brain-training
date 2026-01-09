# 遊戲資料與 Google Sheet 對接欄位

統一 rawResult 形狀與匯出欄位，避免結算畫面混用與報表誤判。若遊戲新開發，請依下列範本擴充。

## Google Sheet 欄位（每筆 GameResult）
- `userId`：使用者/odId
- `sessionId`：遊戲會話 UUID
- `gameId`：遊戲 ID（canonical）
- `difficulty`：`easy|medium|hard`
- `subDifficulty`：1-3
- `timestamp`：ISO 字串
- `durationSec`
- `score`（0-100）
- `grade`（S/A/B/C/D/F）
- `metrics.completion`（0-1）
- `metrics.accuracy`（0-1）
- `metrics.speed`（0-100）
- `metrics.efficiency`（0-100）
- `tracking.correctCount`
- `tracking.wrongCount`
- `tracking.missedCount`
- `tracking.maxCombo`
- `tracking.avgReactionTimeMs`
- `tracking.avgThinkingTimeMs`
- `tracking.totalActions`
- `bestScore`（可選：更新後端最佳成績）
- `gameSpecific.*`（依各遊戲 schema；建議序列化成 JSON 儲存於一欄 `gameSpecific`）
- `displayStats`（可選：JSON，前端顯示用）

### Sheet 版型建議（供 Apps Script 直接寫入）
1. 表單標題：`GameResults`
2. 首列欄位：
   ```
   userId,sessionId,gameId,difficulty,subDifficulty,timestamp,durationSec,score,grade,
   metrics.completion,metrics.accuracy,metrics.speed,metrics.efficiency,
   tracking.correctCount,tracking.wrongCount,tracking.missedCount,tracking.maxCombo,
   tracking.avgReactionTimeMs,tracking.avgThinkingTimeMs,tracking.totalActions,
   bestScore,gameSpecific,displayStats
   ```
3. JSON 欄位（`gameSpecific`,`displayStats`）建議 `JSON.stringify` 後寫入；讀取時用 `JSON.parse`。
4. timestamp 請存 ISO（`new Date().toISOString()`），避免時區誤判。
5. 若需分表：可將每日訓練/一般遊戲分不同 Sheet，欄位相同即可。

## rawResult 需求（各遊戲 emit 到 GamePlayView 的形狀）
### whack-a-mole
- `hitMoles`, `missedMoles`, `hitBombs`, `totalMoles`, `avgReactionTime`, `maxCombo`, `score`

### balance-scale
- `correctCount`, `wrongCount`, `totalCount`, `avgResponseTime`, `optimalSteps`（可選，用於效率）

### card-match
- `matchedPairs`, `totalPairs`, `wrongClicks`, `avgReactionTime`, `movesUsed`, `optimalMoves`

### stroop-test
- `correctCount`, `wrongCount`, `avgResponseTime`, `totalQuestions`

### maze-navigation
- `completed`(bool), `stepsTaken`, `optimalSteps`, `completionTimeMs`

### spot-difference
- `foundCount`, `totalDifferences`, `wrongClicks`, `avgFoundTime`

### math-calc
- `correctCount`, `wrongCount`, `totalCount|totalQuestions`, `avgReactionTime|avgResponseTime`, `maxCombo`, `duration`

### instant-memory
- `correctCount`, `wrongCount`, `maxReached`, `score`, `maxPossibleScore|maxScore`, `duration`

### poker-memory
- `correctCount`, `wrongCount`, `matchedPairs`, `movesUsed`, `optimalMoves`, `duration`

### rock-paper-scissors
- `correctCount`(勝局), `wrongCount`(敗局), `avgReactionTime`, `totalRounds`, `duration`

### gesture-memory
- `correctCount`, `wrongCount`, `maxCombo`, `avgReactionTime`, `duration`

### number-connect
- `completed`(bool), `correctCount`, `wrongCount`, `missedCount`, `totalLinks`, `duration`

### pattern-reasoning
- `correctCount`, `wrongCount`, `totalQuestions`, `avgTime`(秒), `duration`

### audio-memory
- `correctRounds|correctCount`, `totalRounds|totalCount`, `wrongCount|wrongRounds`, `maxStreak`, `maxLength`, `accuracy`(0-100 或 0-1), `duration`

### rhythm-mimic
- `perfectCount`, `goodCount`, `okCount`, `missCount`, `totalNotes|totalBeats`, `avgError`, `duration`

### clock-drawing
- `score`(0-2), `completionTime`, `targetTime`, `selfAssessment` `{ hasCompleteCircle, hasCorrectNumbers, hasCorrectHands }`, `imageData`(base64)，`duration`

> 若欄位缺失，scoreNormalizer 會 fallback，但請盡量符合上述 schema 以避免結算顯示錯誤。
