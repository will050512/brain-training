# brain-training（失智友善腦力訓練） / Elder-Friendly Brain Training

這是一個以長者/失智友善為目標的前端 Web App：提供「Mini-Cog™ 快速認知篩檢」、「完整能力評估」、以及多款認知訓練遊戲，並支援每日訓練（每日挑戰）與訓練報告。
This is an elder-friendly cognitive training web app that provides Mini-Cog™ screening, a full assessment, and multiple training games, with daily challenge flows and reports.

## 功能現況（以程式為準）/ Current Features (source of truth: code)

- 評估
  - `Mini-Cog™`：3 詞語記憶 + 時鐘繪圖（含流程引導與結果頁）
  - 完整能力評估：反應/記憶/邏輯等題型，產出建議難度（行動版避免裁切、減少上下捲動）
- 遊戲（目前註冊 15 款）
  - `whack-a-mole` 打地鼠
  - `balance-scale` 天平比重
  - `card-match` 翻牌配對
  - `stroop-test` Stroop測試
  - `maze-navigation` 皇家花園迷宮
  - `spot-difference` 找不同
  - `math-calc` 加減乘除
  - `instant-memory` 瞬間記憶
  - `poker-memory` 撲克記憶
  - `rock-paper-scissors` 猜拳遊戲
  - `gesture-memory` 手勢記憶
  - `number-connect` 數字連連看
  - `pattern-reasoning` 圖形推理
  - `audio-memory` 聽覺記憶
  - `rhythm-mimic` 節奏模仿
- 每日訓練（每日挑戰）
  - 自動生成當日訓練清單（依認知維度覆蓋與弱項優先）
  - 中途離開後會從資料庫還原當日進度，繼續下一個未完成的遊戲（不會重頭開始）
  - 遊戲結束後可「繼續下一個遊戲」，完成後顯示完成彈窗與可前往報告
- 遊戲結束推薦
  - 結算畫面會推薦「不同維度」的下一個遊戲（若候選不足會退而求其次推薦其他遊戲；每日訓練全部完成時仍會提供推薦）
- 日期與統計
  - 以本地時區計算 `YYYY-MM-DD` 日期鍵，週曆/每日訓練不受 UTC 位移影響

- Assessment
  - `Mini-Cog™`: 3-word recall + clock drawing (guided flow and results)
  - Full assessment: reaction/memory/logic tasks with suggested difficulty (mobile-optimized)
- Games (15 registered)
  - `whack-a-mole`, `balance-scale`, `card-match`, `stroop-test`, `maze-navigation`, `spot-difference`,
    `math-calc`, `instant-memory`, `poker-memory`, `rock-paper-scissors`, `gesture-memory`,
    `number-connect`, `pattern-reasoning`, `audio-memory`, `rhythm-mimic`
- Daily Training (Daily Challenge)
  - Auto-generated daily plan (covers cognitive dimensions and weaker areas first)
  - Resume progress after leaving; continues next unfinished game (no restart)
  - “Continue next game” flow after completion; final dialog links to report
- Post-game Recommendations
  - Summary recommends a game from different dimensions (fallback to others if insufficient candidates)
- Dates & Stats
  - Uses local timezone `YYYY-MM-DD` keys; weekly/daily stats unaffected by UTC shift

## 重要路由 / 操作流程 / Key Routes & Flows

- 遊戲統一入口：`/games/:gameId`
  - 內含：統一的遊戲說明、難度調整、開始遊戲、結算（含推薦/下一步）
  - 相容舊連結：`/games/:gameId/preview` 會 redirect 到 `/games/:gameId`
- 登入：`/login`
- 新手引導：`/onboarding`
- 每日挑戰：`/daily-challenge`
- 能力評估：`/assessment`
- 報告：`/report`、`/weekly-report`
- 營養建議：`/nutrition`
- 設定：`/settings`

- Unified game entry: `/games/:gameId`
  - Includes instructions, difficulty selection, start, results (with next-game recommendations)
  - Legacy link `/games/:gameId/preview` redirects to `/games/:gameId`
- Login: `/login`
- Onboarding: `/onboarding`
- Daily Challenge: `/daily-challenge`
- Assessment: `/assessment`
- Reports: `/report`, `/weekly-report`
- Nutrition: `/nutrition`
- Settings: `/settings`

常用 query（由程式內部使用）：
- `fromDaily=true`：表示從每日訓練進入
- `autoStart=true`：用於「推薦下一個」直接啟動遊戲
- `subDifficulty=1|2|3`：子難度（細分）

Common query params (internal use):
- `fromDaily=true`: entered from daily training
- `autoStart=true`: auto-start the recommended next game
- `subDifficulty=1|2|3`: sub-difficulty

## 開發 / Development

需求：Node.js（建議使用專案既有的 `package-lock.json` 對齊版本）
Requirement: Node.js (align with the version implied by `package-lock.json`).

```bash
npm install
npm run dev
```

建置 / 測試：
Build / Test:

```bash
npm run build
npm run test:run
```

Storybook：
Storybook:

```bash
npm run storybook
```

E2E / 視覺回歸：
E2E / Visual Regression:

```bash
npm run test:e2e
npm run test:e2e:update
```

## 文檔 / Documentation

文件索引與整理：`docs/README.md`
Docs index: `docs/README.md`

## 依賴安全與安裝提醒 / Dependency & Install Notes

- 已升級 `html2pdf.js` 與 `vitest` 系列相依以消除 `npm audit` 中的已知漏洞。
- 若 `npm install` 在 Windows 出現 `EPERM`（通常是 `.vitest-*` 暫存資料夾被占用），請先關閉執行中的 Node/Vite/Vitest 程序，再刪除 `node_modules/.vitest-*` 後重試安裝。
- `npm install` 的 deprecated 警告多為相依樹內部套件，短期不影響執行，可待上游更新。

- `html2pdf.js` and `vitest` dependencies were upgraded to address `npm audit` findings.
- On Windows, if `npm install` fails with `EPERM` (usually `.vitest-*` cache in use), close running Node/Vite/Vitest processes, delete `node_modules/.vitest-*`, and retry.
- Most deprecated warnings are transitive; they do not block execution and can wait for upstream updates.

## 資料儲存與同步 / Data Storage & Sync

- 本地端：使用 IndexedDB（見 `src/services/db.ts`）保存使用者、遊戲紀錄、每日訓練會話、評估結果等。
- 選配：可同步到 Google Sheet（見 `src/services/googleSheetSyncService.ts`；Apps Script Web App 需自行建立，詳見 `docs/data-schema.md`）。
- 同步前提：需使用者同意資料分析（`analyticsConsent=true`），未同意不會上傳。
- 同步資料會攜帶 `schemaVersion`、`scoringVersion` 與資料品質欄位（`dataQuality`、`dataIssues`）。

- Local: IndexedDB (`src/services/db.ts`) stores users, game sessions, daily training, and assessment results.
- Optional: sync to Google Sheets (`src/services/googleSheetSyncService.ts`); create your own Apps Script Web App (see `docs/data-schema.md`).
- Sync requires analytics consent (`analyticsConsent=true`).
- Sync payload includes `schemaVersion`, `scoringVersion`, and data quality fields (`dataQuality`, `dataIssues`).

## 資料同意（Consent）/ Consent

- 同意項目定義與版本：`src/types/user.ts`（`CONSENT_DESCRIPTIONS`、`CURRENT_CONSENT_VERSION`）。
- 行為追蹤與醫療報告屬可選同意，未同意不影響核心遊戲功能。

- Consent definitions and version: `src/types/user.ts` (`CONSENT_DESCRIPTIONS`, `CURRENT_CONSENT_VERSION`).
- Behavior tracking and medical report sharing are optional and do not block core gameplay.

## 外部登入 / App 內嵌 / External Auth & App Embedding

- 支援 App/WebView 透過 `postMessage` 或 `window.BrainTrainingBridge.setExternalProfile(...)` 傳入使用者資料。
- 詳細格式與範例：`docs/app-embedding.md`。

- App/WebView can pass profiles via `postMessage` or `window.BrainTrainingBridge.setExternalProfile(...)`.
- Details and examples: `docs/app-embedding.md`.

## 評分標準 / Scoring

- 參考 `docs/SCORING.md`（標準化計分、權重與難度倍率）。

- See `docs/SCORING.md` (normalization, weights, difficulty multipliers).

## 主題與樣式 / Theme & Styles

- 全站使用 CSS 變數與語義色票（見 `src/style.css`）。
- 主題為藍/綠搭配暖色點綴，支援深色模式。

- Uses CSS variables and semantic color tokens (`src/style.css`).
- Theme: blue/green with warm accents; dark mode supported.

## 資產（Assets）與圖示 / Assets & Icons

- 靜態資產清單：`public/assets_manifest.json`（請在有 `base` 的部署路徑下存取，如 `/brain-training/assets_manifest.json`）。
- `assetLoader` 會依 `assets_manifest.json` 取得圖示；資源缺失時使用 emoji fallback。
- 完整資產列表：`docs/ASSET_FULL_LIST.md`。

- Asset manifest: `public/assets_manifest.json` (with `base`, e.g. `/brain-training/assets_manifest.json`).
- `assetLoader` resolves icons from the manifest; missing assets fallback to emoji.
- Full asset list: `docs/ASSET_FULL_LIST.md`.

## FAQ：base URL 對資產載入的影響 / FAQ: base URL and assets

**Q: 為什麼 icon 變成 🎯 或沒有正確載入？**

A: 若專案設定了 `base`（例如 `/brain-training/`），`assets_manifest.json` 會在 `/brain-training/assets_manifest.json`。
請確認該路徑可正常存取；若 manifest 讀取失敗或用途未匹配，圖示會回退到 emoji。

A: If `base` is set (e.g. `/brain-training/`), `assets_manifest.json` is at `/brain-training/assets_manifest.json`.
Make sure the path is reachable; if manifest loading fails or usage doesn't match, icons fallback to emoji.

## 專案結構（簡略）/ Project Structure (Brief)

- `src/views/`：主要頁面（評估、每日挑戰、遊戲、報告…）
- `src/components/games/`：各遊戲與共用 UI 元件
- `src/games/logic/`：遊戲邏輯（純函數/可測試）
- `src/stores/`：Pinia 狀態（使用者、遊戲、設定）
- `src/services/`：DB、每日訓練、難度自適應、分數正規化等服務

- `src/views/`: route-level views (assessment, daily challenge, games, reports...)
- `src/components/games/`: game UIs and shared game components
- `src/games/logic/`: pure game logic (testable)
- `src/stores/`: Pinia state (user, game, settings)
- `src/services/`: DB, daily training, adaptive difficulty, score normalization, etc.
