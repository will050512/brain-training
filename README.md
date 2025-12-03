# 🧠 健腦訓練 Brain Training

> 一款專為認知訓練設計的 PWA 應用程式，透過有趣的遊戲活化大腦，追蹤認知能力變化。

![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## 📖 專案簡介

健腦訓練是一款以科學為基礎的認知訓練應用程式，專為關注大腦健康的使用者設計。透過多元化的遊戲訓練六大認知維度，並提供專業的退化偵測與個人化建議。

### ✨ 核心特色

- 🎮 **15+ 種訓練遊戲** - 涵蓋記憶、邏輯、反應、注意力等多元訓練
- 📊 **專業評估系統** - 整合 Mini-Cog 等專業認知評估工具
- 🔍 **退化偵測** - 智能分析認知趨勢，早期發現潛在問題
- 📈 **自適應難度** - 根據表現自動調整遊戲難度
- 🎯 **每日訓練** - 個人化每日訓練計畫
- 🥗 **營養建議** - 根據認知表現提供營養補充建議
- 📱 **PWA 支援** - 可安裝至手機，支援離線使用
- 🌙 **深色模式** - 支援淺色/深色主題切換

---

## 🎨 主題系統

本專案採用統一的 CSS 變數主題系統，完整支援淺色與深色模式。

### CSS 變數命名規範

| 變數名稱 | 用途 | 淺色模式 | 深色模式 |
|---------|------|----------|----------|
| `--color-background` | 頁面背景 | `#ffffff` | `#0f172a` |
| `--color-surface` | 卡片/元件表面 | `#ffffff` | `#1e293b` |
| `--color-bg-soft` | 次要背景 | `#f8fafc` | `#1e293b` |
| `--color-text` | 主要文字 | `#1e293b` | `#f1f5f9` |
| `--color-text-secondary` | 次要文字 | `#475569` | `#94a3b8` |
| `--color-text-muted` | 輔助文字 | `#94a3b8` | `#64748b` |
| `--color-border` | 邊框 | `#e2e8f0` | `#334155` |
| `--color-primary` | 主色調 | `#3b82f6` | `#60a5fa` |

### 遊戲專用變數

| 變數名稱 | 用途 |
|---------|------|
| `--game-area-bg` | 遊戲區域背景 |
| `--game-card-bg` | 遊戲卡片背景 |
| `--game-button-bg` | 遊戲按鈕背景 |
| `--game-correct` | 正確回饋顏色 |
| `--game-wrong` | 錯誤回饋顏色 |

### 使用方式

```css
/* 在 scoped CSS 中使用 */
.my-component {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* 在 Tailwind CSS 中使用 */
<div class="bg-[var(--color-surface)] text-[var(--color-text)]">
```

### 主題切換

透過 `useTheme` composable 控制主題：

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme, setTheme } = useTheme()

// 切換主題
toggleTheme()

// 設定特定主題
setTheme('dark')  // 'light' | 'dark' | 'system'
```

---

## 🧩 認知訓練維度

本應用訓練六大認知能力：

| 維度 | 說明 | 相關遊戲 |
|------|------|----------|
| ⚡ **反應力** | 快速反應與處理速度 | 打地鼠、猜拳挑戰、Stroop 測試 |
| 🧩 **邏輯力** | 推理與問題解決能力 | 數學心算、天秤平衡、迷宮導航 |
| 🧠 **記憶力** | 短期與工作記憶 | 撲克記憶、瞬間記憶、卡牌配對 |
| 💡 **認知力** | 認知彈性與資訊處理 | Stroop 測試、大家來找碴 |
| 🎯 **協調力** | 手眼協調與空間處理 | 打地鼠、迷宮導航 |
| 👁️ **專注力** | 持續注意與選擇性注意 | 大家來找碴、Stroop 測試 |

---

## 🎮 遊戲列表

### 記憶類遊戲

#### 🃏 撲克記憶 (PokerMemory)
- **說明**: 記住翻開的撲克牌，找出配對
- **訓練**: 記憶力、專注力
- **難度**: 簡單 4×3、中等 4×4、困難 6×4

#### 🔢 瞬間記憶 (InstantMemory)
- **說明**: 在極短時間內記住顯示的數字或符號
- **訓練**: 工作記憶、處理速度
- **難度**: 隨長度遞增

#### 🎴 卡牌配對 (CardMatch)
- **說明**: 翻找匹配的圖案卡牌
- **訓練**: 視覺記憶、空間記憶
- **難度**: 隨卡牌數量增加

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

### 反應類遊戲

#### 🐹 打地鼠 (WhackAMole)
- **說明**: 快速點擊出現的地鼠
- **訓練**: 反應速度、手眼協調
- **難度**: 隨速度增加

#### ✊✋✌️ 猜拳挑戰 (RockPaperScissors)
- **說明**: 快速選擇能贏電腦的猜拳手勢
- **訓練**: 反應力、決策速度
- **難度**: 隨時間限制縮短

### 認知類遊戲

#### 🌈 Stroop 測試 (StroopTest)
- **說明**: 說出文字的顏色而非文字內容
- **訓練**: 認知控制、抑制能力
- **難度**: 隨干擾程度增加

#### 🔍 大家來找碴 (SpotDifference)
- **說明**: 找出兩張圖片間的差異
- **訓練**: 視覺注意、細節觀察
- **難度**: 隨差異數量與複雜度增加

### 評估類遊戲

#### 🕐 時鐘繪製測試 (ClockDrawingTest)
- **說明**: 繪製指定時間的時鐘
- **訓練**: 視覺空間、執行功能
- **用途**: Mini-Cog 評估工具的一部分

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
│   ├── games/            # 遊戲元件 (15+)
│   └── ui/               # UI 共用元件
│       ├── BaseButton.vue    # 基礎按鈕
│       ├── BaseCard.vue      # 基礎卡片
│       ├── BaseInput.vue     # 基礎輸入框
│       ├── LoadingSpinner.vue # 載入動畫
│       ├── EmptyState.vue    # 空狀態
│       ├── ConsentModal.vue  # 同意視窗
│       ├── GameResultModal.vue # 遊戲結果
│       └── ...
├── composables/          # Vue Composables
│   └── useTheme.ts       # 主題切換
├── core/                 # 核心邏輯
│   └── gameRegistry.ts   # 遊戲註冊中心
├── router/               # 路由設定
├── services/             # 服務層
│   ├── db.ts                         # IndexedDB 資料庫
│   ├── scoreCalculator.ts            # 分數計算
│   ├── professionalScoreCalculator.ts # 專業評分
│   ├── assessmentService.ts          # 評估服務
│   ├── miniCogService.ts             # Mini-Cog 服務
│   ├── declineDetectionService.ts    # 退化偵測
│   ├── dailyTrainingService.ts       # 每日訓練
│   ├── adaptiveDifficultyService.ts  # 自適應難度
│   ├── behaviorAnalysisService.ts    # 行為分析
│   ├── recommendationEngine.ts       # 推薦引擎
│   ├── nutritionPlaceholder.ts       # 營養建議
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

## 📱 PWA 功能

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

### 本地儲存 (IndexedDB)

- `users` - 使用者資料
- `gameResults` - 遊戲結果
- `assessments` - 評估記錄
- `dailyTrainingSessions` - 每日訓練記錄
- `declineAlerts` - 退化警報

### 資料保護

- 所有資料僅儲存於本機
- 無雲端上傳
- 可匯出/匯入資料

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

<div align="center">

**健腦訓練 Brain Training** © 2024

Made with ❤️ for cognitive health

</div>
