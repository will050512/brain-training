<!--
  全新的開發者指南範本
  目的：提供開發者可直接執行的步驟、清楚的專案結構、測試與 CI 指南，以及新增遊戲/元件的實作流程。
-->

# 愛護腦 開發者指南（Developer Guide）

簡短說明：本文件包含開發環境設定、常用指令、專案結構、測試、加入新遊戲與常見維護事項，方便新進與既有開發者快速上手。
Summary: This guide covers environment setup, common scripts, project structure, testing, adding new games, and maintenance notes.

---

## 文件索引 / Docs Index

完整文件索引請見 `docs/README.md`。
Full index in `docs/README.md`.

---

## 目錄 / Table of Contents

1. 快速上手 / Quick Start
2. 常用 scripts 與建議 / Common Scripts & Recommendations
3. 專案結構一覽 / Project Structure
4. 開發流程（新增功能 / 新增遊戲）/ Dev Flow (Features & New Games)
5. 測試與 CI / Testing & CI
6. PWA / 建置細節 / PWA & Build Notes
7. 程式碼規範與建議工具 / Conventions & Tooling
8. 常見問題與故障排除 / Troubleshooting
9. 已發現的不一致與建議修正 / Known Mismatches & Fix Suggestions

---

## 1) 快速上手 / Quick Start

系統需求 / Requirements

- Node.js 18+（建議 Node 20）
- npm / pnpm / yarn

- Node.js 18+ (Node 20 recommended)
- npm / pnpm / yarn

Steps

```bash
# 安裝依賴（一般開發）
npm install

# 乾淨重裝（CI 或需要重置 node_modules）
npm ci

# 開發（熱重載）
npm run dev

# 執行測試
npm run test

# 建構生產版本
npm run build

# 本地預覽生產版本
npm run preview
```

---

## 2) 常用 scripts（現有與建議）/ Common Scripts

從 `package.json` 可得的目前 scripts：
Current scripts from `package.json`:

- `dev`：Vite 開發伺服器 / Vite dev server
- `build`：`vue-tsc -b` 並執行 `vite build`
- `preview`：Vite preview
- `test`, `test:run`, `test:ci`：Vitest 測試 / Vitest tests
- `test:e2e`, `test:e2e:update`：Playwright E2E / visual snapshots
- `storybook`, `build-storybook`：Storybook dev/build
- `generate-icons`：產生 icons（scripts/generate-icons.js）

建議（非強制）新增項：
Recommended (optional):

- `type-check`: `vue-tsc --noEmit`（快速型別檢查 / quick type check）
- `lint`: `eslint --ext .ts,.vue .`（需安裝與設定 ESLint）

註：本文檔後方有「已發現的不一致與建議修正」段落，列出目前文件/設定間的差異與建議修正。
Note: See “Known Mismatches & Fix Suggestions” below.

---

## 3) 專案結構一覽（重點）/ Project Structure

- `src/`：應用程式原始碼 / App source
  - `components/`：Vue 元件（包含 `games/`、`ui/`、`assessment/`）
  - `views/`：路由視圖 / Route-level views
  - `composables/`：通用 composition functions（`useTheme`, `useToast`, `usePWA`...）
  - `games/`：遊戲專屬的 core composables 與 logic
  - `services/`：資料存取、分析、導出的服務
  - `stores/`：Pinia state
  - `types/`：TypeScript 類型

- `scripts/`：工具腳本（icon 產生）
- `public/`：PWA 與靜態資源
- `docs/`：開發文件

重點檔案 / Key Files

- `src/games/index.ts`：遊戲註冊與 meta 資訊
- `src/games/logic/`：純邏輯（可測試的 JS/TS）
- `src/components/games/`：遊戲 UI，應盡量與邏輯分離

---

## 4) 開發流程（新增功能 / 新增遊戲）/ Dev Flow

新增遊戲建議步驟 / Suggested Steps

1. 在 `src/games/logic/` 新增純邏輯檔 `yourGame.ts`
   - 將邏輯設計為純函式，方便測試（輸入 → 輸出）
   - 匯出 `DIFFICULTY_CONFIGS`, `generateRound`, `checkAnswer`, `calculateScore` 等
2. 在 `src/games/logic/__tests__/` 新增單元測試
3. 在 `src/components/games/` 新增 UI 元件（`<script setup>` 與 props/emits 明確）
4. 在 `src/games/index.ts` 註冊遊戲 meta（id, name, component, cognitiveAreas, difficulties）
5. 進行整合測試（手動或 E2E if applicable）
6. 提交 PR 與 reviewer 討論

元件/邏輯分離範例 / Example

```ts
// src/games/logic/mathCalc.ts
export const DIFFICULTY_CONFIGS = { /* ... */ }
export function generateRound(config) { /* pure */ }
export function checkAnswer(answer, expected) { return answer === expected }

// src/components/games/MathCalc.vue
// 使用 logic 與 composables（useGameState, useGameTimer, useGameAudio...）
```

PR 要求（建議）/ PR Recommendations

- 包含測試（若新增邏輯）
- 若修改 UI，附上截圖或簡單錄影
- 更新相對應的 docs（若有 API 變更）

- Include tests for new logic.
- If UI changes, attach screenshots or a short recording.
- Update docs when APIs change.

---

## 5) 測試與 CI / Testing & CI

單元測試（Vitest）
Unit Tests (Vitest)

```bash
# 執行測試
npm run test

# 監聽模式
npm run test -- --watch

# CI 用（以 coverage 為例）
npm run test:ci
```

測試建議 / Testing Notes

- 對純邏輯使用 Vitest（快速且無 DOM 依賴）
- UI 元件考慮使用 `@vue/test-utils` 與 jsdom
- 在 PR 中檢查 coverage 是否顯著下降

- Use Vitest for pure logic (fast, no DOM).
- Consider `@vue/test-utils` + jsdom for UI components.
- Check coverage deltas in PRs.

CI / 部署

- 專案已包含 GitHub Actions 工作流程部署至 GitHub Pages（見 `.github/workflows/deploy.yml`）
- 建議在 CI 中加入：type-check（若新增 `type-check` script）、test, build

---

## 6) PWA / 建置細節 / PWA & Build Notes

- `vite-plugin-pwa` 與 service worker 設定位於 `vite.config.ts`；註冊使用 `virtual:pwa-register`（見 `src/composables/usePWA.ts`）。
- 產生 icons：`npm run generate-icons`（scripts/generate-icons.js）
- Base path：`vite.config.ts` 的 `base` 設定（README 已提到 `/brain-training/`）

離線策略 / Offline Strategy

- 所有遊戲資料會存 local IndexedDB（`idb`）
- 使用者在離線時仍可遊玩與儲存結果，連線後自動同步

- All game data is stored in local IndexedDB (`idb`).
- Users can play offline; sync happens when back online.

---

## 6.1) 產品規則（共用常數）/ Product Rules (Shared Constants)

為避免規則散落與互相矛盾，部分產品門檻以共用常數集中管理於：
To prevent rule drift, some thresholds are centralized at:

- `src/utils/trainingStats.ts`

目前已落地的規則 / Implemented Rules:

- 營養分析/建議解鎖：完成 **5** 場訓練後解鎖（`NUTRITION_UNLOCK_REQUIRED_TRAININGS = 5`）
  - 影響範圍：Report / WeeklyReport / NutritionView 的解鎖提示與進度條
  - PDF：僅在解鎖且有營養建議資料時才會附上營養段落（`includeNutrition` + `NutritionReportData`）
- 月度評估提醒：距離上次評估滿 **30** 天提醒（`ASSESSMENT_REMINDER_DAYS = 30`）
  - 為避免每天打擾，支援「稍後提醒」的 snooze（預設 **7** 天，`ASSESSMENT_REMINDER_SNOOZE_DAYS = 7`）
  - 使用者可在設定頁關閉「每月評估提醒」

---

## 7) 程式碼規範與建議工具 / Conventions & Tooling

規範（摘要）/ Conventions (Summary)

- 元件檔名：PascalCase（`MathCalc.vue`）
- 一般檔案：camelCase（`scoreCalculator.ts`）
- 類型/介面：PascalCase（`GameConfig`）
- 常數：SCREAMING_SNAKE_CASE（`DIFFICULTY_CONFIGS`）

建議 VS Code extensions / Recommended VS Code Extensions

- Vue.volar, Vue Typescript plugin, ESLint, Prettier, TailwindCSS IntelliSense

Lint 與格式化 / Lint & Formatting

- 若要加入 `lint` script，請先建立 `.eslintrc.js` 與 Prettier 設定；本專案文件推薦使用 ESLint + Prettier

---

## 8) 常見問題與故障排除 / Troubleshooting

Q: 測試失敗或型別錯誤？
A:
1. 執行 `npm run test -- --reporter=verbose` 查詳細錯誤
2. 對新的 TypeScript 問題，執行 `vue-tsc --noEmit`（或 `npm run type-check` 若已設定）
3. 檢查是否有相依性版本衝突（node_modules / lockfile）

Q: PWA 不安裝或 Service Worker 沒有註冊？
A:
1. 檢查 `vite-plugin-pwa` 配置與 `virtual:pwa-register`
2. 在瀏覽器 DevTools → Application → Service Workers 檢查狀態

Q: npm install 出現 Storybook 與 Vite 的 peer dependency 衝突？
A:
1. 若需要快速安裝開發依賴，可先使用 `npm install --legacy-peer-deps` 或 `npm install --force`。
2. 若要從根本解決，請對齊 Storybook/Vite 版本相容矩陣。

Q: Windows 上 `npm install` 出現 EPERM/ENOENT，無法刪除 node_modules？
A:
1. 確認沒有執行中的 Node 進程（Vite/Storybook/VS Code terminal），必要時先停止。
2. 刪除 `node_modules` 後再重裝。
3. 若仍無法刪除，請重開機後再試，或改在 NTFS 磁碟上進行安裝。

Q: `npm run build` 出現 `TS1128: Declaration or statement expected`？
A:
1. 通常是 `.vue` 檔案有多餘的 `{` / `}` 或殘留合併衝突標記。
2. 先定位錯誤行號（例如 `src/views/HomeView.vue:439`），檢查是否多了一個結尾大括號。
3. 修正後重新執行 `npm run build`。

---

## 9) 已發現的不一致與建議修正 / Known Mismatches & Fix Suggestions

1. README / docs 中曾提及 `npm run type-check` 與 `npm run lint`，但 `package.json` 目前沒有這兩個 script。建議：
   - 新增 `type-check` 與 `lint` scripts，並在 README/DEVELOPER_GUIDE 中同步更新。
   - 若要新增 `lint`，請建立 ESLint 與 Prettier 配置並加入 `husky` 或 `lint-staged`（選用）以提高 PR 品質。

2. 建議在 CI 流程中加入 `npm run type-check`（若設定）與 `npm run test:ci`，以阻擋型別或測試失敗的合併。

3. 若你希望，我可以：
   - 幫你新增 `type-check` / `lint` scripts 並建立基本的 `.eslintrc` / `.prettierrc`，或
   - 只先更新文件並提出 PR 建議，由你檢視後再決定實作。
