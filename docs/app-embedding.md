# App 內嵌與 Firebase 對接指南

## 總覽
- App (Flutter/Firebase) 在 WebView/Chrome Custom Tabs 中載入本專案。
- Firebase 完成登入後，將使用者 Profile + IdToken 傳給 Web App。
- Web App 透過 `externalAuthBridge` 建立/更新使用者（id 固定 `fb_<uid>`）、記錄 `clientSource`，並同步至 Google Sheet。
- 遊戲/使用者同步仍受 `analyticsConsent` 控制；未同意不會上傳。

## 前端（Web App）設定
1. 入口啟用 bridge
   ```ts
   // main.ts
   import { initExternalAuthBridge } from '@/services/externalAuthBridge'
   initExternalAuthBridge()
   ```
2. 重要檔案
   - `src/services/externalAuthBridge.ts`：接收 postMessage / `window.BrainTrainingBridge.setExternalProfile(...)` / `?externalProfile=<base64url(json)>`
   - `src/types/user.ts`：`gender`, `clientSource?`, `authProvider?`
   - `src/stores/userStore.ts`：`loginWithExternalProfile` (固定 id：`fb_<uid>`)
   - `src/services/userSheetSyncService.ts`：同步 Users 時帶 `clientSource`/`authProvider`
   - `src/services/clientSource.ts`：偵測/儲存 `clientSource`
3. IdToken 使用
   - Bridge 會把 `idToken` 存入 `sessionStorage` (`firebaseIdToken`/`firebaseUid`)。
   - 若要呼叫自家 API，請自行從 `sessionStorage` 取出並塞到 `Authorization` header（目前專案未對後端驗證）。

## Profile 格式（App → Web）
```json
{
  "provider": "firebase",
  "uid": "<firebase-uid>",
  "idToken": "<id-token 可選>",
  "name": "王小明",
  "birthday": "1950-01-01",
  "educationYears": 12,
  "gender": "male",
  "clientSource": "app-android"
}
```
允許的 `clientSource` 建議：`app-android | app-ios | pwa | web | unknown`。

## Flutter / WebView 呼叫範例
方法 A：直接呼叫 bridge
```dart
await controller.runJavascript(
  'window.BrainTrainingBridge?.setExternalProfile(${jsonEncode(profile)})');
```

方法 B：postMessage
```dart
await controller.runJavascript(
  'window.postMessage({type:"brain-training/external-profile", payload:${jsonEncode(profile)}}, "*")');
```

QueryString（可選）：`?externalProfile=<base64url(json of profile)>`

安全：bridge 接受同源與 `null` origin（WebView 常見）；可在 `externalAuthBridge.ts` 內再加白名單。

## Google Sheet / Apps Script
- Web App URL：`https://script.google.com/macros/s/AKfycbwicPXv8VLMkHkvmf4xQCc3qUdMJA_uas1GxyitOCZheNO3L31ZSzt5M8amfsYpphCQ/exec`
- POST 使用 `mode: "no-cors"`；回應為 opaque。
- 支援 `action: upsertGameResults | upsertUsers`，批次用 `items`。

Users 欄位（建議 Sheet `Users`）：
`userId, name, birthday, educationYears, gender, clientSource, authProvider, createdAt, lastActiveAt, updatedAt, profileVersion`

GameResults 欄位（Sheet `GameResults`）：
`userId, sessionId, gameId, difficulty, subDifficulty, timestamp, durationSec, score, grade, metrics.*, tracking.*, bestScore, gameSpecific, displayStats, protocolVersion`

示例：Users payload
```json
{
  "action": "upsertUsers",
  "userId": "fb_123",
  "name": "王小明",
  "birthday": "1950-01-01",
  "educationYears": 12,
  "gender": "male",
  "clientSource": "app-android",
  "authProvider": "firebase",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastActiveAt": "2025-01-09T00:00:00.000Z",
  "updatedAt": "2025-01-09T00:00:00.000Z",
  "profileVersion": 1
}
```

示例：GameResult payload（可在 `gameSpecific.clientSource` 帶來源）
```json
{
  "action": "upsertGameResults",
  "userId": "fb_123",
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
  "gameSpecific": { "hitBombs": 1, "totalMoles": 52, "clientSource": "app-android" },
  "displayStats": [{ "label": "正確率", "value": 92, "unit": "%", "icon": "✅", "highlight": true }],
  "protocolVersion": 2
}
```

## 注意事項
- 遙測/同步需 `analyticsConsent=true` 才會上傳。
- WebView 預設無法讀取 Apps Script 回應；以上傳成功為主，並在前端用 sessionId/userId 去重。
- 若要後端驗證 IdToken，請在自有 API 層處理；目前僅存於 `sessionStorage`。
