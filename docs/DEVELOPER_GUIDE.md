![1765347981543](image/DEVELOPER_GUIDE/1765347981543.png)# 🛠️ 開發者指南

本文件為開發人員提供詳細的專案架構說明與開發指南。

## 📁 專案架構

```
brain-training/
├── src/
│   ├── assets/              # 靜態資源
│   │   ├── audio/           # 音效資源
│   │   │   ├── games/       # 遊戲音效（待補充）
│   │   │   └── AUDIO_ASSETS.md  # 音效規格說明
│   │   └── images/          # 圖片資源
│   │       ├── games/       # 遊戲圖片
│   │       ├── ui/          # UI 元素
│   │       └── IMAGES_ASSETS.md # 圖片規格說明
│   ├── components/          # Vue 元件
│   │   ├── assessment/      # 評估相關元件
│   │   ├── charts/          # 圖表元件
│   │   ├── games/           # 遊戲 UI 元件（16 個）
│   │   ├── layout/          # 佈局元件
│   │   └── ui/              # 共用 UI 元件
│   ├── composables/         # Vue Composables（通用）
│   │   ├── useTheme.ts      # 主題切換
│   │   ├── useToast.ts      # Toast 通知
│   │   ├── usePWA.ts        # PWA 功能
│   │   ├── useResponsive.ts # 響應式工具
│   │   ├── useThrottledEmit.ts # 節流事件
│   │   └── useTouchGesture.ts  # 觸控手勢
│   ├── core/                # 核心邏輯
│   │   └── gameRegistry.ts  # 遊戲註冊中心
│   ├── games/               # 遊戲模組
│   │   ├── core/            # 遊戲專用 Composables
│   │   │   ├── useGame.ts       # 遊戲基礎邏輯
│   │   │   ├── useGameAudio.ts  # 遊戲音效
│   │   │   ├── useGameScore.ts  # 分數計算
│   │   │   ├── useGameState.ts  # 遊戲狀態
│   │   │   └── useGameTimer.ts  # 遊戲計時
│   │   ├── logic/           # 純邏輯（16 個遊戲）
│   │   │   └── __tests__/   # 單元測試
│   │   └── index.ts         # 統一匯出
│   ├── router/              # Vue Router 配置
│   ├── services/            # 服務層（16 個服務）
│   ├── stores/              # Pinia 狀態管理
│   ├── types/               # TypeScript 類型定義
│   ├── utils/               # 工具函式
│   └── views/               # 頁面視圖
├── public/                  # 公開靜態檔案
├── dev-dist/                # PWA 開發檔案
└── docs/                    # 文件資料夾
```

---

## 🎮 遊戲架構模式

### 邏輯/UI 分離模式

每個遊戲採用 Logic/UI 分離架構：

```
遊戲結構
├── src/games/logic/{game}.ts     # 純邏輯（可測試）
├── src/games/logic/__tests__/    # 單元測試
└── src/components/games/{Game}.vue  # UI 元件
```

### 邏輯模組結構

```typescript
// src/games/logic/example.ts

// 1. 類型定義
export interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard'
  // ...
}

export interface GameState {
  score: number
  round: number
  // ...
}

// 2. 難度設定
export const DIFFICULTY_CONFIGS: Record<string, GameConfig> = {
  easy: { /* ... */ },
  medium: { /* ... */ },
  hard: { /* ... */ },
}

// 3. 核心邏輯函式（純函式）
export function generateRound(config: GameConfig): RoundData {
  // ...
}

export function checkAnswer(answer: string, expected: string): boolean {
  // ...
}

export function calculateScore(
  correct: number,
  total: number,
  time: number
): number {
  // ...
}

export function calculateGrade(
  score: number,
  maxScore: number
): 'S' | 'A' | 'B' | 'C' | 'D' {
  // ...
}
```

### UI 元件結構

```vue
<!-- src/components/games/ExampleGame.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ExampleLogic } from '@/games'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'

// Props
const props = defineProps<{
  difficulty: 'easy' | 'medium' | 'hard'
}>()

// Emits
const emit = defineEmits<{
  complete: [result: GameResult]
}>()

// 使用遊戲邏輯
const config = computed(() => 
  ExampleLogic.DIFFICULTY_CONFIGS[props.difficulty]
)

// 使用 Composables
const { state, updateState, resetState } = useGameState()
const { timeLeft, startTimer, stopTimer } = useGameTimer()
const { playSound } = useGameAudio()

// 遊戲邏輯
function startRound() {
  const roundData = ExampleLogic.generateRound(config.value)
  // ...
}

function handleAnswer(answer: string) {
  const isCorrect = ExampleLogic.checkAnswer(answer, expected.value)
  if (isCorrect) {
    playSound('correct')
  } else {
    playSound('wrong')
  }
  // ...
}
</script>
```

---

## 🧪 測試指南

### 單元測試

使用 Vitest 進行遊戲邏輯單元測試：

```bash
# 執行所有測試
npm run test

# 執行特定測試
npm run test -- mathCalc

# 監視模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage
```

### 測試範例

```typescript
// src/games/logic/__tests__/example.test.ts
import { describe, it, expect } from 'vitest'
import {
  generateRound,
  checkAnswer,
  calculateScore,
  calculateGrade,
  DIFFICULTY_CONFIGS,
} from '../example'

describe('ExampleGame Logic', () => {
  describe('DIFFICULTY_CONFIGS', () => {
    it('所有難度設定應存在', () => {
      expect(DIFFICULTY_CONFIGS.easy).toBeDefined()
      expect(DIFFICULTY_CONFIGS.medium).toBeDefined()
      expect(DIFFICULTY_CONFIGS.hard).toBeDefined()
    })
  })

  describe('generateRound', () => {
    it('應生成有效的回合資料', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const round = generateRound(config)
      
      expect(round).toBeDefined()
      expect(round.question).toBeTruthy()
    })
  })

  describe('checkAnswer', () => {
    it('正確答案應返回 true', () => {
      expect(checkAnswer('A', 'A')).toBe(true)
    })

    it('錯誤答案應返回 false', () => {
      expect(checkAnswer('A', 'B')).toBe(false)
    })
  })

  describe('calculateGrade', () => {
    it('100% 分數應得到 S 級', () => {
      expect(calculateGrade(100, 100)).toBe('S')
    })

    it('80% 以上應得到 A 級', () => {
      expect(calculateGrade(85, 100)).toBe('A')
    })
  })
})
```

---

## 🎨 Composables 使用指南

Composables 分為兩類：
- **通用 Composables** (`src/composables/`)：全域使用的功能
- **遊戲 Composables** (`src/games/core/`)：遊戲專用的功能

### 通用 Composables

#### useTheme

管理主題切換：

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme, setTheme, effectiveTheme } = useTheme()

// 切換主題
toggleTheme()

// 設定特定主題
setTheme('dark')  // 'light' | 'dark' | 'system'
```

#### useToast

顯示 Toast 通知：

```typescript
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 成功訊息
showToast('操作成功！', 'success')

// 錯誤訊息
showToast('發生錯誤', 'error')

// 警告訊息
showToast('請注意', 'warning')

// 資訊訊息
showToast('提示訊息', 'info')
```

#### usePWA

PWA 功能管理：

```typescript
import { usePWA } from '@/composables/usePWA'

const { isInstallable, isInstalled, promptInstall } = usePWA()

// 提示使用者安裝
if (isInstallable.value) {
  promptInstall()
}
```

#### useResponsive

響應式工具：

```typescript
import { useResponsive } from '@/composables/useResponsive'

const { isMobile, isTablet, isDesktop, screenWidth } = useResponsive()
```

### 遊戲專用 Composables（src/games/core/）

#### useGameState

管理遊戲狀態：

```typescript
import { useGameState } from '@/games/core/useGameState'

const { 
  score,
  round,
  isPlaying,
  startGame,
  endGame,
  addScore,
  nextRound,
} = useGameState()
```

#### useGameTimer

管理遊戲計時：

```typescript
import { useGameTimer } from '@/games/core/useGameTimer'

const {
  timeLeft,
  isRunning,
  startTimer,
  stopTimer,
  pauseTimer,
  resetTimer,
} = useGameTimer({
  duration: 60,
  onTick: (time) => console.log(`剩餘 ${time} 秒`),
  onEnd: () => endGame(),
})
```

#### useGameAudio

管理遊戲音效：

```typescript
import { useGameAudio } from '@/games/core/useGameAudio'

const { playSound, stopAll } = useGameAudio()

// 播放音效
playSound('correct')  // 答對
playSound('wrong')    // 答錯
playSound('click')    // 點擊
playSound('start')    // 開始
playSound('end')      // 結束
```

#### useGameScore

管理遊戲分數：

```typescript
import { useGameScore } from '@/games/core/useGameScore'

const { score, addScore, resetScore, calculateFinalScore } = useGameScore()
```

---

## 📦 新增遊戲指南

### 步驟 1: 建立邏輯模組

```typescript
// src/games/logic/newGame.ts

// 定義類型
export interface NewGameConfig {
  difficulty: 'easy' | 'medium' | 'hard'
  rounds: number
  timeLimit: number
}

export interface NewGameState {
  // ...
}

// 難度設定
export const DIFFICULTY_CONFIGS: Record<string, NewGameConfig> = {
  easy: { difficulty: 'easy', rounds: 5, timeLimit: 60 },
  medium: { difficulty: 'medium', rounds: 8, timeLimit: 90 },
  hard: { difficulty: 'hard', rounds: 10, timeLimit: 120 },
}

// 核心邏輯
export function generateRound(config: NewGameConfig) {
  // ...
}

export function checkAnswer(/* ... */) {
  // ...
}

export function calculateScore(/* ... */) {
  // ...
}

export function calculateGrade(score: number, maxScore: number) {
  const ratio = score / maxScore
  if (ratio >= 0.95) return 'S'
  if (ratio >= 0.8) return 'A'
  if (ratio >= 0.6) return 'B'
  if (ratio >= 0.4) return 'C'
  return 'D'
}
```

### 步驟 2: 更新 index.ts

```typescript
// src/games/logic/index.ts
import * as NewGameLogic from './newGame'
export { NewGameLogic }

// 類型匯出
export type {
  NewGameConfig,
  NewGameState,
} from './newGame'
```

### 步驟 3: 建立單元測試

```typescript
// src/games/logic/__tests__/newGame.test.ts
import { describe, it, expect } from 'vitest'
import * as NewGameLogic from '../newGame'

describe('NewGame Logic', () => {
  // ... 測試案例
})
```

### 步驟 4: 建立 UI 元件

```vue
<!-- src/components/games/NewGame.vue -->
<script setup lang="ts">
import { NewGameLogic } from '@/games'
// ...
</script>

<template>
  <!-- UI 實作 -->
</template>
```

### 步驟 5: 註冊遊戲

```typescript
// src/core/gameRegistry.ts
import NewGame from '@/components/games/NewGame.vue'

export const gameRegistry = {
  // ...
  'new-game': {
    id: 'new-game',
    name: '新遊戲',
    component: NewGame,
    cognitiveAreas: ['memory', 'logic'],
    difficulties: ['easy', 'medium', 'hard'],
  },
}
```

---

## 🎨 主題開發

### CSS 變數系統

```css
/* src/style.css */

:root {
  /* 色彩系統 */
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-text: #1e293b;
  --color-text-secondary: #475569;
  --color-border: #e2e8f0;
  --color-primary: #3b82f6;
  
  /* 遊戲專用 */
  --game-area-bg: #f8fafc;
  --game-card-bg: #ffffff;
  --game-correct: #10b981;
  --game-wrong: #ef4444;
}

:root.dark {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
  --color-primary: #60a5fa;
  
  --game-area-bg: #1e293b;
  --game-card-bg: #334155;
}
```

### 使用主題

```vue
<script setup>
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme, effectiveTheme } = useTheme()
</script>

<template>
  <div :class="{ 'dark': isDark }">
    <button @click="toggleTheme">
      切換主題
    </button>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
</style>
```

---

## 📊 服務層說明

### 資料庫服務 (db.ts)

```typescript
import { db } from '@/services/db'

// 儲存遊戲結果
await db.gameResults.add({
  gameId: 'math-calc',
  score: 85,
  accuracy: 0.9,
  duration: 120,
  difficulty: 'medium',
  timestamp: Date.now(),
})

// 查詢遊戲結果
const results = await db.gameResults
  .where('gameId')
  .equals('math-calc')
  .reverse()
  .limit(10)
  .toArray()
```

### 評分服務 (scoreCalculator.ts)

```typescript
import { calculateGameScore } from '@/services/scoreCalculator'

const score = calculateGameScore({
  correct: 8,
  total: 10,
  timeUsed: 45,
  timeLimit: 60,
  difficulty: 'medium',
})
```

### 自適應難度 (adaptiveDifficultyService.ts)

```typescript
import { getRecommendedDifficulty } from '@/services/adaptiveDifficultyService'

const recommendation = await getRecommendedDifficulty('math-calc')
// { difficulty: 'hard', reason: '連續3次高表現' }
```

---

## 🔧 開發工具

### 建構指令

```bash
# 開發
npm run dev

# 建構
npm run build

# 預覽
npm run preview

# 類型檢查
npm run type-check

# 程式碼檢查
npm run lint

# 測試
npm run test
npm run test:watch
npm run test:coverage
```

### VS Code 擴充套件建議

```json
// .vscode/extensions.json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## 📝 程式碼規範

### 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| 檔案名稱 | PascalCase (元件) / camelCase (其他) | `MathCalc.vue`, `scoreCalculator.ts` |
| 元件名稱 | PascalCase | `<MathCalc />` |
| 函式名稱 | camelCase | `calculateScore()` |
| 常數 | SCREAMING_SNAKE_CASE | `DIFFICULTY_CONFIGS` |
| 類型/介面 | PascalCase | `GameConfig`, `UserState` |

### TypeScript 規範

```typescript
// ✅ 優先使用 interface
interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard'
}

// ✅ 使用明確類型
function calculate(score: number, max: number): number {
  return score / max
}

// ❌ 避免 any
function bad(data: any) { /* ... */ }

// ✅ 使用泛型
function good<T>(data: T): T { /* ... */ }
```

### Vue 規範

```vue
<!-- ✅ 使用 <script setup> -->
<script setup lang="ts">
import { ref, computed } from 'vue'

// Props 定義
const props = defineProps<{
  title: string
  count?: number
}>()

// Emits 定義
const emit = defineEmits<{
  click: [id: string]
  update: [value: number]
}>()
</script>

<!-- ✅ 模板在中間 -->
<template>
  <div>{{ props.title }}</div>
</template>

<!-- ✅ 樣式在最後，使用 scoped -->
<style scoped>
.component {
  /* ... */
}
</style>
```

---

## 🚨 常見問題

### Q: 遊戲音效沒有播放？

A: 檢查以下項目：
1. 音效檔案是否存在於 `src/assets/audio/games/`
2. 瀏覽器是否允許自動播放音效
3. 使用者是否已與頁面互動過

### Q: 深色模式下顏色不正確？

A: 確保使用 CSS 變數而非硬編碼顏色：
```css
/* ✅ 正確 */
background: var(--color-surface);

/* ❌ 錯誤 */
background: #ffffff;
```

### Q: 測試失敗怎麼辦？

A: 
1. 確認邏輯模組 API 與測試一致
2. 檢查是否有非同步問題
3. 使用 `npm run test -- --reporter=verbose` 查看詳細錯誤

---

## 📚 參考資源

- [Vue 3 文件](https://vuejs.org/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
- [Vitest 文件](https://vitest.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Pinia 狀態管理](https://pinia.vuejs.org/)

---

## 📋 更新日誌

### 2025-12-10 版本更新

#### 🎨 UI/UX 改進

**1. 主色調更新**
- 新增強調色系：
  - `--color-accent-green: #01cb5f`
  - `--color-accent-purple: #a124e0`
  - `--color-accent-blue: #1f8ea9`
  - `--color-accent-dark: #11031d`
- 更新主要漸層：`linear-gradient(135deg, #a124e0 0%, #1f8ea9 100%)`
- `index.html` theme-color 更新為 `#11031d`

**2. LOGO 更新**
- 新增 `logo.png` 作為主要品牌圖示
- 更新 `scripts/generate-icons.js` 自動生成各尺寸圖標
- 執行 `node scripts/generate-icons.js` 重新生成圖標

**3. 遊戲結束推薦改進 (GamePlayView.vue)**
- 遊戲完成後總是顯示推薦區塊
- 大按鈕設計，年長者友善
- 2x2 網格推薦其他維度遊戲
- 無推薦時顯示鼓勵訊息

#### ⚡ 功能改進

**1. 每日挑戰自動化 (DailyChallengeView.vue)**
- 自動生成涵蓋所有 6 個認知維度的訓練計畫
- 一鍵開始連續訓練模式
- 維度覆蓋狀態視覺化顯示
- 訓練進度追蹤

**2. Mini-Cog 組裝模式改進 (ClockDrawingTest.vue)**
- 行動裝置預設使用組裝模式
- 移除即時正確/錯誤顏色提示
- 完成組裝後才進行自動評分
- 更直覺的拖放操作

#### 🔧 技術變更

**檔案變更清單：**
- `src/style.css` - 新增強調色 CSS 變數
- `index.html` - 更新 theme-color
- `scripts/generate-icons.js` - 更新圖標來源路徑
- `src/views/GamePlayView.vue` - 遊戲結束推薦改進
- `src/views/DailyChallengeView.vue` - 每日挑戰重新設計
- `src/components/games/ClockDrawingTest.vue` - 組裝模式改進

**新增檔案：**
- `logo.png` - 新品牌圖示（根目錄）

---

最後更新：2025-12-10
