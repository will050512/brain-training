# 遊戲資料與 Google Sheet 對接欄位

統一 rawResult 形狀與匯出欄位，避免結算畫面混用與報表誤判。若遊戲新開發，請依下列範本擴充。

> Apps Script「完整版本」請使用 `docs/apps-script.gs`（支援 `GameResults` + `Users`、batch、upsert 去重、JSONP 讀取）。

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
- `protocolVersion`（同步協議版本；用於回填修正與相容性）

### Sheet 版型建議（供 Apps Script 直接寫入）
1. 表單標題：`GameResults`
2. 首列欄位：
   ```
   userId,sessionId,gameId,difficulty,subDifficulty,timestamp,durationSec,score,grade,
   metrics.completion,metrics.accuracy,metrics.speed,metrics.efficiency,
   tracking.correctCount,tracking.wrongCount,tracking.missedCount,tracking.maxCombo,
   tracking.avgReactionTimeMs,tracking.avgThinkingTimeMs,tracking.totalActions,
   bestScore,gameSpecific,displayStats,protocolVersion
   ```
3. JSON 欄位（`gameSpecific`,`displayStats`）建議 `JSON.stringify` 後寫入；讀取時用 `JSON.parse`。
4. timestamp 請存 ISO（`new Date().toISOString()`），避免時區誤判。
5. 若需分表：可將每日訓練/一般遊戲分不同 Sheet，欄位相同即可。

## Google Sheet 欄位（每筆 User）
建議建立 `Users` 工作表（每個 `userId` 一列；以 `userId` upsert 更新，避免重複列）。

- `userId`
- `name`
- `birthday`（YYYY-MM-DD）
- `educationYears`
- `gender`（`male|female|other|unknown`）
- `createdAt`（ISO）
- `lastActiveAt`（ISO）
- `updatedAt`（ISO）
- `profileVersion`（用於未來擴充）

### Apps Script 對接（已建置）
- Web App URL：`https://script.google.com/macros/s/AKfycbwicPXv8VLMkHkvmf4xQCc3qUdMJA_uas1GxyitOCZheNO3L31ZSzt5M8amfsYpphCQ/exec`
- 瀏覽器端 `fetch` 注意：Apps Script Web App 通常無法設定 CORS header；若用 `Content-Type: application/json` 會觸發 preflight 導致請求被瀏覽器擋下。
  - 本專案已改用 `mode: 'no-cors'` 並直接送出 JSON 字串（`text/plain`），確保請求可送達。
- 建議以 `POST` 傳送 JSON（字串），範例：
  ```json
  {
    "userId": "od-123",
    "sessionId": "session-uuid",
    "gameId": "whack-a-mole",
    "difficulty": "medium",
    "subDifficulty": 2,
    "timestamp": "2025-12-17T08:00:00.000Z",
    "durationSec": 92,
    "score": 84,
    "grade": "A",
    "metrics": { "completion": 1, "accuracy": 0.92, "speed": 78, "efficiency": 95 },
    "tracking": { "correctCount": 46, "wrongCount": 4, "missedCount": 2, "maxCombo": 8, "avgReactionTimeMs": 620 },
    "bestScore": 90,
    "gameSpecific": { "hitBombs": 1, "totalMoles": 52 },
    "displayStats": [
      { "label": "正確率", "value": 92, "unit": "%", "icon": "✅", "highlight": true },
      { "label": "平均反應", "value": 0.62, "unit": "秒", "icon": "⚡" }
    ]
  }
  ```
- 若使用完整 Apps Script 版本：請在 payload 加上 `action: "upsertGameResults"` 及 `protocolVersion: 2`；批次寫入使用 `{ "action": "upsertGameResults", "items": [ ... ] }`。Users 同理使用 `{ "action": "upsertUsers", "items": [ ...UserPayload ] }`。
- Apps Script 端建議：
  - 驗證必填欄位（`userId`,`sessionId`,`gameId`,`timestamp`,`score`），若欄位缺漏則回傳 400。
  - `displayStats` 建議存 `[]`（JSON 字串），`gameSpecific` 建議存 `{}`（JSON 字串）。
  - 以 `sessionId` 去重：同一 sessionId 重送時不要重複 append（可改成 update 該列）。
  - 批次回填：接受 `{ "action": "upsertGameResults", "items": [ ...SheetPayload ] }`，用 `setValues()` 一次寫入提升速度。

### 舊用戶資料回填流程（連線後自動補寫）
1. 客戶端啟動時，讀取本地 IndexedDB/LocalStorage 的舊紀錄（若有 legacy `GameResult` 形狀）。
2. 逐筆用 `scoreNormalizer.normalize(gameId, rawResult, difficulty, subDifficulty, durationSec)` 轉為 `UnifiedGameResult`，再用 `unifiedToLegacyGameResult` 或 `normalizeToLegacyGameResult` 確保欄位完整。
3. 將結果映射成「Google Sheet 欄位」格式（同上表頭，JSON 欄位用 `JSON.stringify`）。
4. 以批次或逐筆 `POST` 到 Apps Script URL；建議攜帶 `sessionId`/`timestamp` 避免重複寫入，可由 Apps Script 端去重。

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
