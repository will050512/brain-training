"""
新 README：保留專案重點與開發者快速上手指南。更詳細內容請參閱 `docs/DEVELOPER_GUIDE.md`。
"""

# 🧠 健腦訓練 (brain-training)

輕量型、可離線的 PWA 前端應用，透過多種遊戲提供認知訓練、評估與行為分析。此專案以 Vue 3 + TypeScript + Vite 為基礎。

> • 完整開發指南與進階內容請見 `docs/DEVELOPER_GUIDE.md`

---

## 🔧 主要資訊

- 技術：Vue 3 (Composition API), TypeScript 5+, Vite, Pinia, Tailwind CSS
- PWA、IndexedDB (idb)、ECharts
- 版本：`v1.1.2`（package.json）

---

## 🚀 快速開始

系統需求
- Node.js 18+（建議 Node 20）
- npm / pnpm / yarn

步驟

```bash
# 1. 安裝依賴
npm ci

# 2. 啟動開發伺服器
npm run dev

# 3. 建構生產版本
npm run build

# 4. 本地預覽生產版本
npm run preview

# 5. 執行測試
npm run test
```

常用 scripts（依 `package.json`）

- `dev` - 啟動 Vite
- `build` - 執行 `vue-tsc -b` 並 `vite build`
- `preview` - `vite preview`
- `test` / `test:run` / `test:ci` - Vitest
- `generate-icons` - 產生 app icons

建議新增（選擇性）：

```json
"type-check": "vue-tsc --noEmit",
"lint": "eslint --ext .ts,.vue ."
```

> 注意：目前文件曾提到 `npm run type-check` 與 `npm run lint`，但 `package.json` 未一定包含此兩項；如需我也可以替你新增並設定 ESLint/Prettier。 

---

## 📁 檔案與目錄

- `src/` - Vue 元件、views、composables、games、services、stores 等
- `docs/` - 開發者指南與規範
- `scripts/` - 小工具（如 icons 產生腳本）
- `public/` - 公開靜態資源
- `docs/data-schema.md` - 各遊戲 rawResult 與 Google Sheet 對接欄位定義

---

## 🛠️ 開發流程（簡要）

1. 建立分支：`git checkout -b feat/xxx`
2. 開發並加入測試：`npm run test` 或 `npm run test:watch`
3. 執行型別檢查（如已配置）：`npm run type-check`
4. 格式化/檢查（如已配置）：`npm run lint`
5. 提交 PR，填寫變更說明與測試步驟

更詳盡的實作細節、如何新增遊戲、測試策略、CI 與部署在：`docs/DEVELOPER_GUIDE.md`。

---

## 🤝 貢獻

歡迎 PR 與 issue！請確保包含測試或說明如何驗證變更。

---

如需我直接替你：
- 加入 `type-check` / `lint` scripts
- 建立 ESLint/Prettier 配置
- 或把這份 README 再精簡成英文版

請告訴我你要我繼續執行哪些變更。
- **說明**: 在極短時間內記住顯示的數字或符號
- **訓練**: 工作記憶、處理速度
- **難度**: 隨長度遞增

#### 🎴 卡牌配對 (CardMatch)
- **說明**: 翻找匹配的圖案卡牌
- **訓練**: 視覺記憶、空間記憶
- **難度**: 隨卡牌數量增加

#### 🎵 聲音記憶 (AudioMemory)
- **說明**: 聆聽並記住播放的聲音序列，然後依序重現
- **訓練**: 聽覺記憶、聲音辨識、專注力
- **特色**: 
  - 20 種聲音素材（動物、樂器、自然、生活）
  - 序列長度隨表現自動調整
- **難度**: 簡單 2-4 音、中等 3-6 音、困難 4-8 音

#### 👋 手勢記憶 (GestureMemory)
- **說明**: 觀察並記住手勢序列，然後依序點擊重現
- **訓練**: 記憶力、協調力、序列記憶
- **特色**: 
  - 12 種手勢圖示（揮手、讚、勝利、OK 等）
  - 視覺化手勢展示
- **難度**: 簡單 2-4 個、中等 3-6 個、困難 4-8 個

### 邏輯類遊戲

#### ➕ 數學心算 (MathCalc)
- **說明**: 快速完成加減乘除運算
- **訓練**: 邏輯力、處理速度
- **難度**: 簡單加減、中等乘除、困難複合

#### ⚖️ 天秤平衡 (BalanceScale)
- **說明**: 計算讓天秤平衡所需的重量
- **訓練**: 邏輯推理、數學能力
- **難度**: 隨問題複雜度增加

#### 🧭 迷宮導航 (MazeNavigation)
- **說明**: 找到迷宮出口的最短路徑
- **訓練**: 空間推理、規劃能力
- **難度**: 隨迷宮大小增加

#### 🧩 圖案推理 (PatternReasoning)
- **說明**: 根據圖案序列規律，選出正確的下一個圖案
- **訓練**: 邏輯推理、模式識別、抽象思維
- **題型**: 
  - 旋轉題：圖案旋轉規律
  - 序列題：形狀循環規律
  - 變換題：大小漸變規律
  - 類比題：A:B = C:? 推理
  - 遞進題：顏色與大小遞進
- **難度**: 簡單 2 種題型、中等 3 種題型、困難 5 種題型

### 反應類遊戲

#### 🐹 打地鼠 (WhackAMole)
- **說明**: 快速點擊出現的地鼠
- **訓練**: 反應速度、手眼協調
- **難度**: 隨速度增加

#### ✊✋✌️ 猜拳挑戰 (RockPaperScissors)
- **說明**: 快速選擇能贏電腦的猜拳手勢
- **訓練**: 反應力、決策速度
- **難度**: 隨時間限制縮短

#### 🥁 節拍模仿 (RhythmMimic)
- **說明**: 聆聽節奏模式後，點擊螢幕重現相同節拍
- **訓練**: 節奏感、時間感知、協調能力
- **特色**: 
  - 10 種節奏模式（華爾滋、切分音、三連音等）
  - 即時評分（Perfect/Good/OK/Miss）
- **難度**: 簡單 300ms 容差、中等 200ms 容差、困難 150ms 容差

### 專注類遊戲

#### 🔢 數字連連看 (NumberConnect)
- **說明**: 依序連接 1 到 N 的數字，考驗視覺追蹤能力
- **訓練**: 視覺追蹤、注意力、序列認知
- **特色**: 
  - 支援阿拉伯數字、中文數字、混合模式
  - 錯誤點擊計數
  - 提示功能
- **難度**: 簡單 10 個數字、中等 15 個數字、困難 20 個數字（含中文）

### 認知類遊戲

#### 🌈 Stroop 測試 (StroopTest)
- **說明**: 根據難度判斷文字顏色或意思
- **訓練**: 認知控制、抑制能力
- **遊戲模式**:
  - **簡單模式**: 判斷墨水顏色（看顏色）
  - **中等模式**: 判斷文字意思（看字義）
  - **困難模式**: 混合模式（隨機切換顏色/字義判斷）
- **特色**: 包含彩色外框增加視覺干擾

#### 🔍 大家來找碴 (SpotDifference)
- **說明**: 找出兩張圖片間的差異
- **訓練**: 視覺注意、細節觀察
- **難度**: 隨差異數量與複雜度增加

### 評估類遊戲

#### 🕐 時鐘繪製測試 (ClockDrawingTest)
- **說明**: 繪製指定時間的時鐘
- **訓練**: 視覺空間、執行功能
- **用途**: Mini-Cog 評估工具的一部分
- **觸控優化**: 已修正手機觸控座標計算，支援順暢繪圖體驗
- **題目隨機化**: 每次測試隨機選擇不同的目標時間
  - 臨床常用時間庫：11:10、10:11、2:45、3:40、8:20、1:50、9:15、4:35
  - 避免記憶效應，提高測試有效性
  - 同時顯示數字格式（2:45）與中文描述（二點四十五分）

---

## 📊 專業功能

### Mini-Cog 認知評估

整合臨床驗證的 Mini-Cog 快速認知篩檢：
- 三詞回憶測試
- 時鐘繪製測試
- 自動評分與風險分級

### 退化偵測系統

- **基本模式**: 偵測簡單的分數下降趨勢
- **專業模式**: 使用統計分析，偵測顯著退化
- 可自訂敏感度與回溯期

### 自適應難度

根據玩家表現自動調整：
- 連續高表現 → 增加難度（子難度 → 主難度）
- 連續失敗 → 降低難度，循序漸進
- 保持適當挑戰程度
- **即時反饋**: 遊戲結束時顯示詳細的難度調整說明
  - 調整原因（高表現/需加強）
  - 新舊難度對比
  - 個人化鼓勵訊息

### 新使用者引導

完善的新用戶體驗流程：
- **強制評估**: 新用戶必須完成認知評估才能開始遊戲訓練
- **評估引導卡**: 首頁顯示醒目的橘色引導卡，提示完成評估
- **進度解鎖**: 趨勢分析需完成 5 場遊戲後解鎖
  - 顯示解鎖進度條
  - 提示還需幾場遊戲

### 評估驅動每日訓練

Mini-Cog 或完整評估結果會影響每日訓練：
- **認知檔案分析**: 讀取最新評估結果，計算認知狀態
- **個人化難度建議**: 根據評估分數自動調整每個遊戲的推薦難度
- **視覺化呈現**: 每日訓練頁面顯示評估狀態卡片與難度建議

### 資料使用同意書

用戶隱私保護機制：
- **首次使用詢問**: 顯示資料使用同意書，說明資料如何被使用
- **快速確認**: 直接點擊確認按鈕時，預設同意所有選項
- **Toast 通知**: 確認後顯示「已同意所有選項」提示
- **記錄保存**: 同意選項存入 IndexedDB，可隨時查看或修改

### 行為分析

追蹤並分析：
- 遊戲時段偏好
- 認知波動模式
- 最佳表現時間

### 個人化推薦

根據分析結果提供：
- 推薦訓練的認知維度
- 推薦遊戲
- 最佳訓練時段
- 營養補充建議

---

## 🛠️ 技術架構

### 前端技術

```
Vue 3.4 + TypeScript 5
├── Vite 5 (建構工具)
├── Pinia (狀態管理)
├── Vue Router (路由)
├── Tailwind CSS (樣式)
├── ECharts (圖表)
└── idb (IndexedDB 封裝)
```

### 專案結構

```
src/
├── components/           # Vue 元件
│   ├── assessment/       # 評估相關元件
│   ├── charts/           # 圖表元件
│   ├── games/            # 遊戲元件 (16 個)
│   └── ui/               # UI 共用元件
│       ├── BaseButton.vue    # 基礎按鈕
│       ├── BaseCard.vue      # 基礎卡片
│       ├── BaseInput.vue     # 基礎輸入框
│       ├── LoadingSpinner.vue # 載入動畫
│       ├── EmptyState.vue    # 空狀態
│       ├── ConsentModal.vue  # 同意視窗（支援預設全選）
│       ├── GameResultModal.vue # 遊戲結果
│       ├── ToastNotification.vue # Toast 通知元件
│       ├── InstallPrompt.vue # PWA 安裝提示（含 iOS 指引）
│       └── ...
├── composables/          # Vue Composables（通用）
│   ├── useTheme.ts       # 主題切換
│   ├── useToast.ts       # Toast 通知系統
│   ├── usePWA.ts         # PWA 功能
│   ├── useResponsive.ts  # 響應式工具
│   ├── useThrottledEmit.ts # 節流事件
│   └── useTouchGesture.ts  # 觸控手勢
├── games/                # 遊戲模組
│   ├── core/             # 遊戲核心 Composables
│   │   ├── useGame.ts        # 遊戲基礎邏輯
│   │   ├── useGameAudio.ts   # 遊戲音效
│   │   ├── useGameScore.ts   # 分數計算
│   │   ├── useGameState.ts   # 遊戲狀態
│   │   └── useGameTimer.ts   # 遊戲計時
│   └── logic/            # 遊戲邏輯（16 個遊戲）
├── core/                 # 核心邏輯
│   └── gameRegistry.ts   # 遊戲註冊中心
├── router/               # 路由設定
├── services/             # 服務層
│   ├── db.ts                         # IndexedDB 資料庫
│   ├── scoreCalculator.ts            # 分數計算
│   ├── professionalScoreCalculator.ts # 專業評分
│   ├── assessmentService.ts          # 評估服務
│   ├── miniCogService.ts             # Mini-Cog 服務
│   ├── clockDrawingAnalyzer.ts       # 時鐘繪圖 AI 分析
│   ├── declineDetectionService.ts    # 退化偵測
│   ├── dailyTrainingService.ts       # 每日訓練
│   ├── adaptiveDifficultyService.ts  # 自適應難度
│   ├── behaviorAnalysisService.ts    # 行為分析
│   ├── correlationAnalysisService.ts # 相關性分析
│   ├── recommendationEngine.ts       # 推薦引擎
│   ├── nutritionPlaceholder.ts       # 營養建議
│   ├── pdfService.ts                 # PDF 報告生成
│   ├── taiwanNormativeData.ts        # 台灣常模數據
│   └── offlineSyncService.ts         # 離線同步
├── stores/               # Pinia stores
│   ├── userStore.ts      # 使用者狀態
│   ├── gameStore.ts      # 遊戲狀態
│   └── settingsStore.ts  # 設定狀態
├── types/                # TypeScript 類型
│   ├── cognitive.ts      # 認知維度類型
│   ├── game.ts           # 遊戲類型
│   └── user.ts           # 使用者類型
└── views/                # 頁面視圖
    ├── HomeView.vue          # 首頁
    ├── LoginView.vue         # 登入
    ├── OnboardingView.vue    # 引導
    ├── GameSelectView.vue    # 遊戲選擇
    ├── GamePlayView.vue      # 遊戲進行
    ├── DailyChallengeView.vue # 每日挑戰
    ├── AssessmentView.vue    # 認知評估
    ├── ReportView.vue        # 報告
    ├── WeeklyReportView.vue  # 週報
    ├── NutritionView.vue     # 營養建議
    └── SettingsView.vue      # 設定
```

---

## 🚀 快速開始

### 系統需求

- Node.js 18+
- npm 或 yarn 或 pnpm

### 安裝步驟

```bash
# 1. 複製專案
git clone <repository-url>
cd brain-training

# 2. 安裝依賴
npm install

# 3. 啟動開發伺服器
npm run dev

# 4. 開啟瀏覽器
# 預設網址: http://localhost:5173
```

### 建構指令

```bash
# 開發模式
npm run dev

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview

# 類型檢查
npm run type-check

# 代碼檢查
npm run lint
```

---

## 🌐 部署至 GitHub Pages

本專案已配置好 GitHub Actions 自動部署至 GitHub Pages。

### 自動部署（推薦）

1. 將專案推送至 GitHub
2. 前往 Repository → Settings → Pages
3. 在 Source 區域選擇 **GitHub Actions**
4. 每次推送至 `main` 分支會自動觸發部署

### 手動部署

```bash
# 1. 建構生產版本
npm run build

# 2. 將 dist/ 資料夾內容部署至 gh-pages 分支
# 或使用 gh-pages 工具
npm install -g gh-pages
gh-pages -d dist
```

### GitHub Actions 工作流程

專案已包含 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Vite 基礎路徑設定

在 `vite.config.ts` 中已設定 base 路徑：

```typescript
export default defineConfig({
  base: '/brain-training/', // 替換為您的 repo 名稱
  // ...
})
```

---

## 📱 PWA 功能

### APP 化體驗

本應用採用無滾動式 APP 佈局設計：
- **固定頭部**: 頁面標題與導航按鈕固定在頂部
- **內容區滾動**: 僅內容區域可滾動，保持 APP 原生感
- **底部安全區**: 支援 iPhone 等裝置的安全區域 (Safe Area)
- **響應式設計**: 手機、平板、桌面裝置皆可流暢使用

### PWA 安裝提示

積極推廣 PWA 安裝：
- **手機即時提示**: 手機用戶訪問時立即顯示安裝橫幅
- **iOS Safari 指引**: 針對 iOS 用戶提供手動安裝步驟說明
- **輕量底部橫幅**: 關閉主要提示後，顯示輕量橫幅持續提醒
- **智能時機**: Android 用戶 1 天後再次提示，iOS 用戶 3 天後

### 安裝至裝置

1. 使用 Chrome、Edge 或 Safari 開啟應用
2. 點擊瀏覽器的「安裝」按鈕
3. 應用將安裝至桌面/主畫面

### 離線功能

- 所有遊戲可離線遊玩
- 遊戲結果本地儲存
- 連線恢復後自動同步

---

## 📋 路由說明

| 路徑 | 名稱 | 說明 | 需要登入 |
|------|------|------|----------|
| `/` | Home | 首頁儀表板 | 否 |
| `/login` | Login | 登入/註冊 | 否 |
| `/onboarding` | Onboarding | 新手引導 | 否 |
| `/games` | GameSelect | 遊戲選擇 | 是 |
| `/games/:id` | GamePlay | 遊戲進行 | 是 |
| `/daily-challenge` | DailyChallenge | 每日挑戰 | 是 |
| `/assessment` | Assessment | 認知評估 | 是 |
| `/report` | Report | 個人報告 | 是 |
| `/weekly-report` | WeeklyReport | 週報詳情 | 是 |
| `/nutrition` | Nutrition | 營養建議 | 是 |
| `/settings` | Settings | 設定 | 否 |

---

## 🔧 設定選項

### 使用者設定

| 設定 | 說明 | 預設值 |
|------|------|--------|
| 每日訓練時長 | 每日目標訓練分鐘數 | 15 分鐘 |
| 退化偵測模式 | 基本/專業 | 基本 |
| 預設難度 | 遊戲預設難度 | 中等 |
| 自適應難度 | 開啟/關閉 | 開啟 |

### 系統設定

| 設定 | 說明 | 預設值 |
|------|------|--------|
| 音效 | 開啟/關閉遊戲音效 | 開啟 |
| 深色模式 | 開啟/關閉 | 系統 |
| 語言 | 介面語言 | 繁體中文 |

---

## 📈 資料儲存

### 本地儲存架構

本專案使用 IndexedDB（透過 `idb` 封裝）在本機儲存所有資料，確保使用者隱私。

### 資料庫結構 (13 個資料表)

| 資料表 | 說明 | 主要欄位 |
|--------|------|----------|
| `users` | 使用者基本資料 | id, name, avatar, settings |
| `settings` | 應用程式設定 | theme, difficulty, sound |
| `gameResults` | 遊戲結果記錄 | gameId, score, accuracy, duration |
| `gameSessions` | 遊戲詳細過程 | sessionId, actions, timestamps |
| `assessments` | 認知評估記錄 | type, scores, date |
| `miniCogResults` | Mini-Cog 專屬結果 | wordRecall, clockDrawing, score |
| `dailyTrainingSessions` | 每日訓練紀錄 | date, games, totalMinutes |
| `declineAlerts` | 退化警報記錄 | dimension, severity, date |
| `consentRecords` | 同意書記錄 | type, version, accepted |
| `weeklyReports` | 週報快照 | weekStart, scores, analysis |
| `nutritionLogs` | 營養追蹤記錄 | date, foods, supplements |
| `behaviorMetrics` | 行為分析數據 | patterns, preferences |
| `syncQueue` | 離線同步佇列 | action, data, timestamp |

### 資料生命週期

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  遊戲進行   │ ──► │  本地儲存   │ ──► │  分析計算   │
│ (Vue 元件)  │     │ (IndexedDB) │     │  (Services) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  匯出/匯入  │
                    │  (JSON 檔)  │
                    └─────────────┘
```

### 資料匯出與備份

```typescript
// 在 SettingsView 中可匯出所有資料
const exportData = async () => {
  const data = await db.exportAll()
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  // 下載為 JSON 檔案
}
```

### 資料保護

- ✅ 所有資料僅儲存於使用者本機
- ✅ 無雲端上傳，無第三方存取
- ✅ 支援完整資料匯出
- ✅ 支援資料匯入還原
- ✅ 可清除所有資料重新開始

---

## ⚠️ 免責聲明

本應用程式僅供認知訓練與娛樂用途，**不能用於醫療診斷**。

- 評估結果僅供參考，不代表臨床診斷
- 營養建議需諮詢專業醫療人員
- 如有認知健康疑慮，請諮詢醫師

---

## 🤝 貢獻指南

歡迎提交 Issue 或 Pull Request！

### 開發流程

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 程式碼規範

- 使用 ESLint 與 Prettier
- 遵循 Vue 3 Composition API 風格
- TypeScript 類型完整
- 元件使用 `<script setup>` 語法

### 深色模式開發指南

#### CSS 變數使用原則

```css
/* ✅ 正確：使用 CSS 變數 */
.my-component {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

/* ❌ 避免：硬編碼顏色 */
.my-component {
  background: #ffffff;
  color: #1f2937;
}
```

#### Tailwind CSS 深色模式

```vue
<!-- ✅ 正確：使用 dark: 變體 -->
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

<!-- ✅ 正確：使用 CSS 變數 -->
<div class="bg-[var(--color-surface)] text-[var(--color-text)]">

<!-- ❌ 避免：只有淺色樣式 -->
<div class="bg-white text-gray-900">
```

#### JavaScript 中取得 CSS 變數

```typescript
// 輔助函式
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

// 使用
const bgColor = getCSSVar('--color-surface')
const textColor = getCSSVar('--color-text')
```

#### Canvas 繪圖深色模式

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

function drawChart() {
  const bgColor = getCSSVar('--color-canvas-bg')
  const strokeColor = getCSSVar('--color-canvas-stroke')
  
  ctx.fillStyle = bgColor
  ctx.strokeStyle = strokeColor
}

// 監聽主題變化重繪
watch(isDark, () => {
  drawChart()
})
```

#### ECharts 圖表主題

```typescript
import { useTheme } from '@/composables/useTheme'
import { getChartTheme } from '@/utils/chartTheme'

const { effectiveTheme } = useTheme()
const chartTheme = computed(() => getChartTheme(effectiveTheme.value))

// 監聽主題變化重新初始化
watch(effectiveTheme, () => {
  chart.dispose()
  initChart()
})
```

#### 新增 CSS 變數

在 `src/style.css` 中新增：

```css
:root {
  /* 淺色模式 */
  --color-my-new-color: #3b82f6;
}

:root.dark {
  /* 深色模式 */
  --color-my-new-color: #60a5fa;
}
```

---

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

---

## 🙏 致謝

- [Vue.js](https://vuejs.org/) - 漸進式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端建構工具
- [Tailwind CSS](https://tailwindcss.com/) - 實用優先的 CSS 框架
- [ECharts](https://echarts.apache.org/) - 企業級圖表庫
- [Mini-Cog](https://mini-cog.com/) - 認知篩檢工具

---

## 📝 更新日誌

### v1.1.2 (2025-12-10)

#### 修復與優化
- 🐛 **每日訓練流程修復**: 修正每日訓練中「下一關」按鈕無法正確跳轉的問題
- 📱 **遊戲介面響應式優化**: 改善手機版遊戲頂部資訊列（計時器、分數）的顯示佈局，解決遮擋問題
- 🔄 **評估流程優化**: 完成認知評估後現在會直接導向每日訓練頁面，提供更流暢的體驗
- 💾 **數據保存機制**: 強化每日訓練完成後的數據保存機制，確保進度正確記錄

### v1.1.1 (2025-12-03)

#### 新功能
- ✨ **時鐘測試題目隨機化**: 時鐘繪圖測試目標時間每次隨機選擇
  - 8 種臨床常用時間（11:10、10:11、2:45、3:40、8:20、1:50、9:15、4:35）
  - 同時顯示數字與中文描述（如「二點四十五分」）
  - AI 分析與手動評分自動同步正確的目標時間

### v1.1.0 (2025-12-03)

#### 新功能
- ✨ **Toast 通知系統**: 新增全局 Toast 通知，提供即時操作回饋
- ✨ **評估驅動訓練**: Mini-Cog 或完整評估結果現可影響每日訓練推薦難度
- ✨ **Stroop 測試多模式**: 根據難度自動切換墨水顏色/文字意思/混合判斷模式
- ✨ **PWA 安裝強化**: 手機用戶即時提示、iOS Safari 安裝指引、輕量底部橫幅

#### 改進
- 🔧 **時鐘繪圖觸控修復**: 修正手機觸控座標計算，繪圖更順暢
- 🔧 **同意書預設全選**: 直接確認時預設同意所有選項並顯示 Toast
- 🎨 **APP 化佈局**: HomeView、GameSelectView、SettingsView 改為無滾動 APP 體驗
- 🎨 **精簡化設計**: 首頁卡片更緊湊，適合手機單手操作

#### 技術更新
- 📦 新增 `useToast.ts` composable
- 📦 新增 `ToastNotification.vue` 元件
- 📦 新增 APP 佈局 CSS 類別（`.app-page`, `.app-header`, `.app-content-scroll` 等）
- 📦 新增 `.scrollbar-hide` 工具類別

### v1.0.0 (初始版本)
- 🎉 16 種認知訓練遊戲
- 🎉 Mini-Cog 專業評估整合
- 🎉 退化偵測與自適應難度系統
- 🎉 PWA 離線支援
- 🎉 深色模式

---

<div align="center">

**健腦訓練 Brain Training** © 2025

Made with ❤️ for cognitive health

</div>
