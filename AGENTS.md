# AGENTS.md — 代理式編碼倉庫指南 (Repository Guide for Agentic Coding)

此文件說明了在本倉庫中如何進行開發、測試以及遵循現有的慣例。
**目標受眾**：自動化編碼代理 (AI Agents) 以及新進貢獻者。

## 專案概覽

* **技術棧**：Vue 3 + Vite (ESM, TypeScript)
* **樣式**：Tailwind v4 + CSS 變數（設計標記位於 `src/style.css`）
* **狀態與路由**：Pinia stores, Vue Router, Vitest 測試
* **PWA**：透過 `vite-plugin-pwa` 實現

## 指令 (建置 / 檢查 / 測試)

> 定義於 `package.json`。

### 安裝

* `npm install`

### 開發

* `npm run dev` — 啟動 Vite 開發伺服器
* `npm run preview` — 預覽生產環境建置結果

### 建置

* `npm run build` — 執行 `vue-tsc -b` 進行型別檢查，隨後執行 `vite build`

### 測試

* `npm run test` — 監聽模式 (Vitest)
* `npm run test:run` — 單次執行
* `npm run test:ci` — 執行並產生測試覆蓋率報告

#### 執行單一測試文件

* `npx vitest run src/games/logic/__tests__/whackAMole.test.ts`

#### 執行符合名稱的測試

* `npx vitest run -t "balance"`

### Storybook

* `npm run storybook`
* `npm run build-storybook`

### 資源生成

* `npm run generate-icons`

## 倉庫規則 (Cursor/Copilot)

* 尚未偵測到 `.cursorrules`、`.cursor/rules/` 或 `.github/copilot-instructions.md`。

## 代碼風格與慣例

### TypeScript

* 偏好為公開 API、介面 (Interfaces) 與導出函數提供**顯式型別 (Explicit types)**。
* 僅導入型別時請使用 `import type`。
* 避免使用型別抑制（如 `as any`, `@ts-ignore`, `@ts-expect-error`）。
* 避免未使用的導出 (Exports) 與無效代碼 (Dead code)。

### Vue (SFC)

* 使用 `<script setup lang="ts">`（本倉庫之標準用法）。
* 將邏輯保留在 `<script setup>` 中；避免在模板 (Template) 撰寫複雜的內聯邏輯。
* 保持模板可讀性；派生變數偏好使用 `computed` 計算屬性。
* 為了**長者友善 (Elder-friendly)** 的使用者體驗，請保持觸控目標 (Touch targets) >= 44px。

### Tailwind 與樣式

* 使用 Tailwind v4 搭配 CSS 變數（設計標記）。
* 偏好使用**語義化 CSS 變數**（例如 `var(--color-text)`, `var(--color-surface)`）而非硬編碼顏色。
* 設計系統文件：`docs/DESIGN_SYSTEM.md`, `docs/RESPONSIVE_DESIGN_SYSTEM.md`。
* 共用樣式與標記位於 `src/style.css`。

### 導入與模組解析

* 使用 `@` 作為 `src/` 的別名（參閱 `vite.config.ts`）。
* 保持導入分組：外部庫在前，隨後是本地模組。

### 命名規範

* 變數與函數使用 `camelCase`（小駝峰）。
* 組件與型別使用 `PascalCase`（大駝峰）。
* 檔案命名：在適用處使用 `kebab-case`（Vue 組件遵循 PascalCase，但路由與 ID 通常使用 kebab-case）。

### 錯誤處理

* 對外部調用與容錯操作使用 `try/catch`。
* 使用 `console.error` 記錄錯誤（此為服務層採用的模式）。
* 除非是明確為了「盡力而為」的同步操作，否則不要靜默忽略 (Swallow) 錯誤。

### 數據與同步

* 本地存儲使用 IndexedDB (`src/services/db.ts`)。
* 存在 Google Sheet 同步服務：
* `src/services/googleSheetSyncService.ts`（完整架構）
* `src/services/simpleSheetSyncService.ts`（簡單每日日誌）


* Apps Script 範例：
* `docs/apps-script.gs`（完整）
* `docs/simple-apps-script.gs`（簡單）



### 資源加載

* 靜態資源清單：`public/assets_manifest.json`。
* 資源加載器：`src/services/assetLoader.ts`。
* 當資源缺失時，使用 Emoji 作為回退 (Fallback) 方案。

### 遊戲系統

* 遊戲註冊表：`src/games/index.ts`。
* 邏輯模組位於 `src/games/logic/` 並經過單元測試。
* 遊戲結果透過 `src/services/scoreNormalizer.ts` 進行歸一化。

## 測試指南

* 邏輯測試位於 `src/games/logic/__tests__/`。
* 偏好對確定性邏輯編寫單元測試（本倉庫無 UI 測試）。
* 保持測試簡短且具確定性；避免異步定時產生的不穩定性 (Flakiness)。

## 格式化

* 未偵測到明確的 ESLint/Prettier 配置。
* 遵循檔案中現有的格式（2 個空格縮進，不強制要求分號）。
* 保持合理的行長度；在可行情況下對過長的模板行進行換行。

## 性能與無障礙 (Accessibility)

* PWA 快取規則定義於 `vite.config.ts`。
* 尊重來自 `settingsStore` 的無障礙設定。
* 避免引入笨重的依賴；優先使用現有的工具函數。

## 執行型別檢查

* `npm run build` 會觸發 `vue-tsc -b` 進行型別檢查。

## 給 Agent 進行變更的筆記

* 修復 Bug 時避免進行大規模重構。
* 匹配鄰近檔案的現有模式。
* 若新增服務，請放置於 `src/services/` 並保持其純粹性 (Pure)。
* 若新增遊戲資源，請更新 `public/assets_manifest.json`。

## 已知約束

* 本應用程式目標受眾為**長者**；優先考慮易讀性與清晰的互動。
* 避免劇烈動畫；尊重「減少動態效果 (Reduce-motion)」設定。

## 文件索引

* `README.md` — 產品概覽與路由
* `docs/README.md` — 文件索引
* `docs/SCORING.md` — 計分規則
* `docs/data-schema.md` — Google Sheet 架構
