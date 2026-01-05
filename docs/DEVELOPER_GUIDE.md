<!--
  全新的開發者指南範本
  目的：提供開發者可直接執行的步驟、清楚的專案結構、測試與 CI 指南，以及新增遊戲/元件的實作流程。
-->

# 🛠️ 開發者指南（Developer Guide）

簡短說明：本文件包含開發環境設定、常用指令、專案結構、測試、加入新遊戲與常見維護事項，方便新進與既有開發者快速上手。

---

## 目錄

1. 快速上手
2. 常用 scripts 與建議
3. 專案結構一覽
4. 開發流程（新增功能 / 新增遊戲）
5. 測試與 CI
6. PWA / 建置細節
7. 程式碼規範與建議工具
8. 常見問題與故障排除
9. 已發現的不一致與建議修正

---

## 1) 快速上手

系統需求

- Node.js 18+（建議 Node 20）
- npm / pnpm / yarn

步驟

```bash
# 安裝依賴
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

## 2) 常用 scripts（現有與建議）

從 `package.json` 可得的目前 scripts：

- `dev`：Vite 開發伺服器
- `build`：`vue-tsc -b` 並執行 `vite build`
- `preview`：Vite preview
- `test`, `test:run`, `test:ci`：Vitest 測試
- `generate-icons`：產生 icons（scripts/generate-icons.js）

建議（非強制）新增項：

- `type-check`: `vue-tsc --noEmit`（快速型別檢查）
- `lint`: `eslint --ext .ts,.vue .`（需要安裝並設定 ESLint）

註：本文檔後方有「已發現的不一致與建議修正」段落，列出目前文件/設定間的差異與建議修正。

---

## 3) 專案結構一覽（重點）

- `src/`：應用程式原始碼
  - `components/`：Vue 元件（包含 `games/`、`ui/`、`assessment/`）
  - `views/`：路由視圖
  - `composables/`：通用 composition functions（`useTheme`, `useToast`, `usePWA`...）
  - `games/`：遊戲專屬的 core composables 與 logic
  - `services/`：資料存取、分析、導出的服務（db, scoreCalculator, recommendationEngine...）
  - `stores/`：Pinia state
  - `types/`：TypeScript 類型

- `scripts/`：工具腳本（icon 數位產生等）
- `public/`：PWA 與靜態資源
- `docs/`：開發文件（此處）

重點檔案

- `src/core/gameRegistry.ts`：遊戲註冊與 meta 資訊
- `src/games/logic/`：純邏輯（可測試的 JS/TS），建議所有遊戲邏輯放此處
- `src/components/games/`：遊戲 UI，應盡量與邏輯分離

---

## 4) 開發流程（新增功能 / 新增遊戲）

新增遊戲建議步驟

1. 在 `src/games/logic/` 新增純邏輯檔 `yourGame.ts`
   - 將邏輯設計為純函式，方便測試（輸入 → 輸出）
   - 匯出 `DIFFICULTY_CONFIGS`, `generateRound`, `checkAnswer`, `calculateScore` 等
2. 在 `src/games/logic/__tests__/` 新增單元測試
3. 在 `src/components/games/` 新增 UI 元件（`<script setup>` 與 props、emits 明確）
4. 在 `src/core/gameRegistry.ts` 註冊遊戲 meta（id, name, component, cognitiveAreas, difficulties）
5. 進行整合測試（手動或 E2E if applicable）
6. 提交 PR 與 reviewer 討論

元件/邏輯分離範例

```ts
// src/games/logic/mathCalc.ts
export const DIFFICULTY_CONFIGS = { /* ... */ }
export function generateRound(config) { /* pure */ }
export function checkAnswer(answer, expected) { return answer === expected }

// src/components/games/MathCalc.vue
// 使用 logic 與 composables（useGameState, useGameTimer, useGameAudio...）
```

PR 要求（建議）

- 包含測試（若新增邏輯）
- 若修改 UI，附上截圖或簡單錄影
- 更新相對應的 docs（若有 API 變更）

---

## 5) 測試與 CI

單元測試（Vitest）

```bash
# 執行測試
npm run test

# 監聽模式
npm run test -- --watch

# CI 用（以 coverage 為例）
npm run test:ci
```

測試建議

- 對純邏輯使用 Vitest（快速且無 DOM 依賴）
- UI 元件考慮使用 `@vue/test-utils` 與 jsdom
- 在 PR 中檢查 coverage 是否顯著下降

CI / 部署

- 專案已包含 GitHub Actions 工作流程部署至 GitHub Pages（見 `.github/workflows/deploy.yml`）
- 建議在 CI 中加入：type-check（若新增 `type-check` script）、test, build

---

## 6) PWA / 建置細節

- `vite-plugin-pwa` 與 service worker 設定位於專案中（請查 `vite.config.ts` 與 `dev-dist/`）
- 產生 icons：`npm run generate-icons`（scripts/generate-icons.js）
- Base path：`vite.config.ts` 的 `base` 設定（README 已提到 `/brain-training/`）

離線策略

- 所有遊戲資料會存 local IndexedDB（`idb`）
- 使用者在離線時仍可遊玩與儲存結果，連線後自動同步

---

## 6.1) 產品規則（共用常數）

為避免規則散落與互相矛盾，部分產品門檻以共用常數集中管理於：

- `src/utils/trainingStats.ts`

目前已落地的規則：

- 營養分析/建議解鎖：完成 **5** 場訓練後解鎖（`NUTRITION_UNLOCK_REQUIRED_TRAININGS = 5`）
   - 影響範圍：Report / WeeklyReport / NutritionView 的解鎖提示與進度條
   - PDF：僅在解鎖且有營養建議資料時才會附上營養段落（`includeNutrition` + `NutritionReportData`）
- 月度評估提醒：距離上次評估滿 **30** 天提醒（`ASSESSMENT_REMINDER_DAYS = 30`）
   - 為避免每天打擾，支援「稍後提醒」的 snooze（預設 **7** 天，`ASSESSMENT_REMINDER_SNOOZE_DAYS = 7`）
   - 使用者可在設定頁關閉「每月評估提醒」

---

## 7) 程式碼規範與建議工具

規範（摘要）

- 元件檔名：PascalCase（`MathCalc.vue`）
- 一般檔案：camelCase（`scoreCalculator.ts`）
- 類型/介面：PascalCase（`GameConfig`）
- 常數：SCREAMING_SNAKE_CASE（`DIFFICULTY_CONFIGS`）

建議 VS Code extensions

- Vue.volar, Vue Typescript plugin, ESLint, Prettier, TailwindCSS IntelliSense

Lint 與格式化

- 若要加入 `lint` script，請先建立 `.eslintrc.js` 與 Prettier 設定；本專案文件推薦使用 ESLint + Prettier

---

## 8) 常見問題與故障排除

Q: 測試失敗或型別錯誤？

A:

1. 執行 `npm run test -- --reporter=verbose` 查詳細錯誤
2. 對新的 TypeScript 問題，執行 `vue-tsc --noEmit`（或 `npm run type-check` 若已設定）
3. 檢查是否有相依性版本衝突（node_modules / lockfile）

Q: PWA 不安裝或 Service Worker 沒有註冊？

A:

1. 檢查 `vite-plugin-pwa` 配置與 `registerSW.js`
2. 在瀏覽器 DevTools → Application → Service Workers 檢查狀態

---

## 9) 已發現的不一致與建議修正 ✅

1. README / docs 中曾提及 `npm run type-check` 與 `npm run lint`，但 `package.json` 目前沒有這兩個 script。建議：
   - 新增 `type-check` 與 `lint` scripts，並在 README/DEVELOPER_GUIDE 中同步更新。
   - 若要新增 `lint`，請建立 ESLint 與 Prettier 配置並加入 `husky` 或 `lint-staged`（選用）以提高 PR 品質。

2. 建議在 CI 流程中加入 `npm run type-check`（若設定）與 `npm run test:ci`，以阻擋型別或測試失敗的合併。

3. 若你希望，我可以：
   - 幫你新增 `type-check` / `lint` scripts 並建立基本的 `.eslintrc` / `.prettierrc`，或
   - 只先更新文件並提出 PR 建議，由你檢視後再決定實作。
