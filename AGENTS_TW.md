# 專案知識庫 / PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-29 17:56 (Asia/Taipei)
**Commit:** 07b9277
**Branch:** main

## 概覽 / OVERVIEW
以長者友善為核心的認知訓練 Web App（Vue 3 + Vite + TypeScript），包含遊戲、評估、每日訓練與本地優先同步。
Elder-friendly cognitive training web app (Vue 3 + Vite + TypeScript) with games, assessments, daily training, and local-first data sync.

## 結構 / STRUCTURE
```
./
├── src/                 # app code
│   ├── components/      # UI components (views + games + shared UI)
│   ├── games/           # game registry + core + logic
│   ├── services/        # data, scoring, sync, PWA, assets
│   ├── stores/          # Pinia stores
│   ├── composables/     # Vue composables
│   ├── views/           # route-level views
│   └── style.css        # design tokens + global styles
├── public/              # static assets + assets_manifest.json
├── docs/                # product/dev/design docs
├── .storybook/          # Storybook config
├── scripts/             # build helpers (generate-icons)
└── dist/ dev-dist/      # build artifacts
```

## 位置索引 / WHERE TO LOOK
| 任務 | 位置 | 備註 |
|------|------|------|
| App 啟動 | `src/main.ts` | DB 初始化 + migration + 遊戲註冊
| 路由與守衛 | `src/router/index.ts` | 登入與評估 gate
| 遊戲註冊 | `src/games/index.ts` | 註冊全部遊戲
| 遊戲核心 hooks | `src/games/core/` | Timer/state/score/audio
| 遊戲邏輯 | `src/games/logic/` | 純邏輯 + `__tests__`
| 遊戲 UI | `src/components/games/` | 各遊戲 Vue SFC
| 共用 UI | `src/components/ui/` | 可重用 UI 元件
| 設定 + 無障礙 | `src/stores/settingsStore.ts` | reduce motion / contrast / theme
| 本地 DB | `src/services/db.ts` | IndexedDB layer
| 同步 (Sheets) | `src/services/googleSheetSyncService.ts` | 完整同步流程
| 計分 | `src/services/scoreNormalizer.ts` + `docs/SCORING.md` | 歸一化規則
| 資產 | `public/assets_manifest.json` + `src/services/assetLoader.ts` | Emoji fallback
| PWA | `vite.config.ts` + `src/composables/usePWA.ts` | Workbox + 更新流程
| 設計系統 | `docs/DESIGN_SYSTEM.md` | Tailwind v4 + CSS vars

## 慣例 / CONVENTIONS
- Vue SFC 使用 `<script setup lang="ts">`。
- Tailwind v4 + CSS 變數；token 在 `src/style.css`。
- 匯入別名 `@` -> `src/`（Vite + TS paths）。
- 測試聚焦在邏輯（`src/games/logic/__tests__/`）。
- `npm run build` 會先跑 `vue-tsc -b` 再 `vite build`。
- PWA base 是 `/brain-training/`（影響資產與路由）。

## 反模式（本專案） / ANTI-PATTERNS (THIS PROJECT)
- 禁用型別抑制（`as any`, `@ts-ignore`, `@ts-expect-error`）。
- 修 bug 時避免大規模重構。
- 不要改動 build artifacts（`dist/`, `dev-dist/`）。
- 避免硬編碼顏色；用語義化 CSS 變數。
- 觸控目標需 >= 44px（長者友善）。

## 特殊風格 / UNIQUE STYLES
- 長者友善 UX：大字體、清楚版面、支援 reduce motion。
- PWA + 離線支援；資產缺失時回退 emoji。

## 指令 / COMMANDS
```bash
npm install
npm run dev
npm run build
npm run test:run
npm run storybook
```

## 備註 / NOTES
- `base` 有設定時，資產 manifest 路徑為 `/brain-training/assets_manifest.json`。
- 測試以邏輯為主，無 UI 測試。
