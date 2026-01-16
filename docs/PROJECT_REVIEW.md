# 專案盤點與落差清單

本文件整理專案現況、缺失與 UI/UX 可改善點，並對照文件與實作落差，作為後續修正的基準。

## 現況摘要
- 15 款遊戲已註冊並可由 `/games/:gameId` 統一入口啟動（`src/games/index.ts`、`src/core/gameRegistry.ts`）。
- 主要流程：登入/Onboarding → 評估 → 首頁 → 每日挑戰/遊戲 → 報告（`src/router/index.ts`）。
- 本地資料儲存在 IndexedDB，並可依 consent 同步到 Google Sheet（`src/services/db.ts`、`src/services/*SyncService.ts`）。
- PWA 安裝提示與更新提示已存在（`src/components/ui/InstallPrompt.vue`、`src/components/ui/PWAUpdateBanner.vue`）。

## 缺失或邏輯不清
1. 連續天數統計未檢查日期是否連續，可能高估 streak（`src/services/dailyTrainingService.ts`）。
2. 每日訓練 10 分鐘配置使用 6 個迷你遊戲，但註解與時間估算不一致，實際總時長不清楚（`src/services/dailyTrainingService.ts`）。
3. 行為追蹤開關（`enableBehaviorTracking`）只存在設定與 onboarding，未實際用於行為記錄或同步的 gating（`src/stores/settingsStore.ts`、`src/views/OnboardingView.vue`）。
4. 退化偵測模式、字體大小、高對比、減少動畫、語音提示/震動等設定有 store 支援但無 UI 入口（`src/stores/settingsStore.ts`、`src/views/SettingsView.vue`）。
5. 主題切換功能存在但設定頁 UI 已註解，使用者無法切換（`src/composables/useTheme.ts`、`src/views/SettingsView.vue`）。
6. 設定頁顯示版本為 1.0.0，與 `package.json` 的 1.1.2 不一致（`src/views/SettingsView.vue`、`package.json`）。
7. 週曆與統計計算包含所有遊戲紀錄，未區分「每日挑戰」與「自由遊戲」，是否符合產品定義需確認（`src/views/HomeView.vue`、`src/services/dailyTrainingService.ts`）。

## UI/UX 優化建議
1. 設定頁加入：字體大小、主題、對比/動畫、語音/震動、退化偵測模式與資料同意的管理入口。
2. 將「每日挑戰」與「自由遊戲」的進度與統計分開顯示，降低理解成本。
3. 在首頁或報告頁明確標示「資料是否上傳」與 consent 狀態，並提供一鍵重試同步。
4. 卡牌配對難度為 12 對時提供足量圖示，避免混用 emoji（`src/components/games/CardMatch.vue`、`src/assets/images/card-match/icons/`）。
5. 天平遊戲素材與邏輯統一：目前只使用 1-3 的砝碼（`src/games/logic/balanceScale.ts`、`src/components/games/BalanceScale.vue`）。
6. 數字連連看背景素材存在但未使用，可增加辨識度與視覺層次（`src/components/games/NumberConnect.vue`、`src/assets/images/number-connect/background.svg`）。

## 文件與實作落差
1. README 未描述 Onboarding、設定頁、PWA 行為與 consent 流程（`README.md`）。
2. `docs/ASSET_REQUIREMENTS.md` 標示部分素材「已補齊」，但實際 UI 尚未導入（CardMatch/BalanceScale/NumberConnect）。
3. `docs/PRIORITY_PLAN.md`、`docs/UX_PLAN.md` 為舊計畫，已刪除以避免混淆。

## 後續建議（可選）
- 若要修正 streak 定義，需以「日期連續」計算。
- 若要維持每日訓練分鐘數承諾，建議校正 `estimatedTime` 或調整遊戲數量。
- 將已存在的設定與 consent 管理介面化，降低功能隱性化問題。
