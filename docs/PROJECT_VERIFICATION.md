# 專案驗證與補強說明書

本文件依據目前程式碼實作，整理專案的邏輯/觸發方式、UI/UX 流程、資料收集與同步機制，並說明此次補強內容與驗證步驟。

## 1. 專案總覽
- 技術棧：Vue 3 + Vite + TypeScript + Pinia
- 重點流程：登入/Onboarding → 評估 → 首頁 → 每日挑戰/遊戲 → 報告
- 本地資料：IndexedDB（`src/services/db.ts`）
- 雲端同步：Google Sheet（`src/services/*SyncService.ts`）

## 2. 核心邏輯與觸發點
### 2.1 App 啟動流程（`src/main.ts`）
1. `initExternalAuthBridge()`：外部登入橋接先註冊。
2. `initDatabase()`：初始化 IndexedDB。
3. `initMigrations()`：資料遷移。
4. `dataInitService.initialize()`：訂閱 store 變化、同步每日訓練狀態。
5. `initAutoSync()`：啟動離線同步機制。
6. `quickLogin` 嘗試恢復登入狀態（localStorage）。
7. `registerAllGames()` 註冊遊戲。
8. `app.mount()` 掛載。

### 2.2 路由與守衛（`src/router/index.ts`）
- `requiresAuth`：檢查 `brain-training-current-user`。
- `requiresAssessment`：以 `brain-training-assessment-<userId>` 判斷是否完成評估。
- 未完成評估會導向 `/assessment`。

### 2.3 登入與使用者資料（`src/stores/userStore.ts`、`src/components/views/LoginViewContent.vue`）
- login/quickLogin/loginWithTransferCode/loginWithExternalProfile：
  - 寫入 localStorage（last/current user）
  - `dataInitService.initUserData()` 初始化每日訓練/同步狀態
- LoginView 只負責表單/跳轉；初始化交由 store。

### 2.4 每日訓練（`src/services/dailyTrainingService.ts`、`DailyChallengeViewContent.vue`）
- `createPersonalizedTrainingPlan()`：依弱項/未測試維度/目標週期選遊戲。
- `markGameCompleted()`：記錄完成狀態。
- `syncDailyTrainingFromDB()`：刷新頁時恢復進度。

### 2.5 遊戲流程（`GamePlayViewContent.vue`）
- `ready → playing → finished` 狀態流。
- 結算時：
  - normalize 結果（`scoreNormalizer`）
  - clamp score（避免 >100）
  - `recordGameResult()` → syncSessionToSheet
  - Daily training 完成同步
- `pendingResultSave` 用於保障寫入完成。

### 2.6 行為追蹤與同步
- `BehaviorCollector` 收集行為事件。
- `saveAll()`：寫入 DB 後同步到 Sheet（錯誤不影響主流程）。

## 3. UI/UX 流程
### 3.1 登入
- `/login`：輸入姓名/生日/教育年數，或用轉移碼。

### 3.2 Onboarding
- `OnboardingView` 提供評估方式（Mini-Cog / 快評），引導至 `/assessment`。

### 3.3 評估
- `/assessment`：Mini-Cog 或完整評估，結果存入 settingsStore，並可同步 Sheet。

### 3.4 首頁
- 顯示每日進度、週訓練紀錄、提醒與認知趨勢。
- 若已登入，會同步載入每日進度與週訓練資料。

### 3.5 遊戲與每日挑戰
- `/daily-challenge`：顯示今日訓練清單。
- `/games/:gameId`：統一遊戲入口（準備、遊玩、結算）。

## 4. 資料收集與同步
- IndexedDB：gameSessions、dailyTrainingSessions、miniCogResults、behaviorLogs。
- 雲端：
  - `googleSheetSyncService.ts`：遊戲結果
  - `userSheetSyncService.ts`：使用者資料
  - `userDataSheetSyncService.ts`：每日訓練、評估、行為日誌

## 5. 本次補強重點
1. **啟動時同步/恢復機制**
   - `dataInitService.initialize()` 與 `initAutoSync()` 在 main.ts 啟動。
   - 自動 quickLogin 恢復使用者狀態。

2. **行為日誌同步不中斷主流程**
   - `BehaviorCollector.saveAll()` 加入 try/catch，避免同步失敗影響 UI。

3. **User sheet sync 防呆**
   - `userSheetSyncService.postToSheet` 增加 SHEET_ENDPOINT 檢查。

4. **登入流程統一**
   - LoginView 移除重複 localStorage 設定，改由 store 處理。

5. **首頁週訓練資料補齊載入**
   - HomeView 初次載入同步呼叫 `loadWeeklyData()`。

6. **遊戲結束寫入提示**
   - 若結果仍 pending，3 秒後警告（不阻塞 UI）。

## 6. 驗證與測試計畫
### 6.1 功能驗證
1. **啟動恢復**
   - 有 `brain-training-current-user` → 自動登入。
2. **每日訓練續玩**
   - 遊戲結束後 → Daily challenge 進度保留。
3. **行為日誌**
   - 同步失敗不影響遊戲流程。

### 6.2 指令驗證
```bash
npm run build
npm run test:run
```

### 6.3 LSP 驗證
- 針對修改檔案執行 `lsp_diagnostics`。

## 7. 風險點與後續建議
- Google Sheet endpoint 若未設定仍會影響同步 UI 狀態（建議加顯示提示）。
- dataInitService.initialize() 須確保只執行一次（已透過 isInitialized guard）。
- 若需更完整導引，可加入「同步狀態提示」與「訓練進度同步結果」。

---
更新檔案：
- `src/main.ts`
- `src/services/behaviorAnalysisService.ts`
- `src/services/userSheetSyncService.ts`
- `src/stores/userStore.ts`
- `src/components/views/LoginViewContent.vue`
- `src/components/views/HomeViewContent.vue`
- `src/components/views/GamePlayViewContent.vue`
- `docs/PROJECT_VERIFICATION.md`
