# 專案盤點與落差清單 / Project Review & Gaps

本文件整理專案現況、缺失與 UI/UX 可改善點，並對照文件與實作落差，作為後續修正的基準。
This document summarizes the current state, gaps, UI/UX improvements, and doc/code mismatches.

## 現況摘要 / Current Summary
- 15 款遊戲已註冊並可由 `/games/:gameId` 統一入口啟動（`src/games/index.ts`）。
- 主要流程：登入/Onboarding → 評估 → 首頁 → 每日挑戰/遊戲 → 報告（`src/router/index.ts`）。
- 本地資料儲存在 IndexedDB，並可依 consent 同步到 Google Sheet（`src/services/db.ts`、`src/services/*SyncService.ts`）。
- PWA 安裝提示與更新提示已存在（`src/components/ui/InstallPrompt.vue`、`src/components/ui/PWAUpdateBanner.vue`）。

- 15 games are registered under `/games/:gameId` (`src/games/index.ts`).
- Main flow: Login/Onboarding → Assessment → Home → Daily Challenge/Games → Reports (`src/router/index.ts`).
- Data is stored in IndexedDB and optionally synced to Google Sheets with consent (`src/services/db.ts`, `src/services/*SyncService.ts`).
- PWA install/update UI exists (`src/components/ui/InstallPrompt.vue`, `src/components/ui/PWAUpdateBanner.vue`).

## 缺失或邏輯不清 / Gaps or Ambiguity
1. 連續天數統計是否嚴格檢查「日期連續」需再次確認（`src/services/dailyTrainingService.ts`）。
2. 每日訓練時間估算與遊戲數量的文案是否一致需定期對照（`src/services/dailyTrainingService.ts`、UI 文案）。
3. 行為追蹤開關已在設定 UI 與 store 中存在，需確認是否已完整套用於行為收集與同步 gating。
4. 設定頁已提供字體大小、對比、減少動畫、語音/震動、主題等入口（`src/components/views/SettingsViewContent.vue`）。
5. 同步狀態與 consent 管理已有 UI；後續可補強顯示細節與錯誤提示一致性。

1. Verify streak logic strictly checks date continuity (`src/services/dailyTrainingService.ts`).
2. Ensure daily training time estimates match copy and game count across UI/services.
3. Confirm behavior tracking toggles are fully applied to data collection/sync gating.
4. Settings UI already exposes font size, contrast, reduce motion, voice/haptics, theme (see `SettingsViewContent.vue`).
5. Sync status and consent UI exist; consider improving detail/error UX consistency.

## UI/UX 優化建議 / UX Suggestions
1. 明確區分「每日挑戰」與「自由遊戲」在統計與報告的呈現。
2. 在首頁或報告頁更清楚提示同步狀態與 consent 狀態。
3. 將推薦/提醒文案與實際規則同步（例如每日訓練分鐘數）。

1. Separate Daily Challenge vs Free Play in stats/reporting.
2. Clarify sync status and consent state in Home/Report views.
3. Align recommendation/reminder copy with actual rules (e.g., daily training duration).

## 文件與實作落差 / Doc vs Code Mismatches
1. `docs/apps-script.gs` 在多處被引用但不存在；請改為「自行建立 Apps Script Web App」。
2. `docs/README.md` 音效連結應指向 `src/assets/audio/games/README.md`。
3. `docs/ASSET_UI_USAGE.md` 需指向根目錄 `/ASSET_GUIDE.md`。
4. PWA 註冊不使用 `registerSW.js` 檔案，而是 `virtual:pwa-register`（`src/composables/usePWA.ts`）。
5. `docs/ASSET_REQUIREMENTS.md` 需與實際素材使用狀態一致（例如 BalanceScale 已使用 weight-1..5）。

1. `docs/apps-script.gs` is referenced but missing; document as “create your own Apps Script Web App”.
2. Audio README path should be `src/assets/audio/games/README.md`.
3. `docs/ASSET_UI_USAGE.md` should point to `/ASSET_GUIDE.md` (root).
4. PWA register uses `virtual:pwa-register` instead of `registerSW.js`.
5. `docs/ASSET_REQUIREMENTS.md` should match actual asset usage (e.g., BalanceScale uses weight-1..5).
