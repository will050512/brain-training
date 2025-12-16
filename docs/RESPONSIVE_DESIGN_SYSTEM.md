# 響應式佈局系統設計規範

## 概述

本系統針對失智症訓練應用設計，特別優化桌面、PWA、手機觀看體驗。採用流體設計原則，使用 `clamp()` 函數實現無縫縮放，解決固定寬度限制、文字過大/小、佈局未優化等問題。

## 核心原則

### 1. 流體設計 (Fluid Design)
- 使用 `clamp(min, preferred, max)` 函數實現動態縮放
- 根據視窗寬度自動調整元素尺寸
- 確保在所有裝置上都有良好的可讀性和可用性

### 2. 長者友善觸控體驗
- 最小觸控目標：56px (建議 64px)
- 充足的點擊區域和視覺回饋
- 防止誤觸和跟手偏差

### 3. 內容優先佈局
- 根據內容重要性進行響應式調整
- 保持資訊層次結構清晰
- 優化閱讀流程

## 斷點系統

採用 7 個斷點，提供更細緻的控制：

```css
/* 斷點定義 */
--breakpoint-xs: 480px;   /* 超小手機 */
--breakpoint-sm: 640px;   /* 小手機 */
--breakpoint-md: 768px;   /* 大手機/小平板 */
--breakpoint-lg: 1024px;  /* 平板 */
--breakpoint-xl: 1280px;  /* 小桌面 */
--breakpoint-2xl: 1536px; /* 桌面 */
--breakpoint-3xl: 1920px; /* 大桌面 */
```

### 媒體查詢範圍

```css
/* 超小手機 */
@media (max-width: 479px) { /* xs */ }

/* 小手機 */
@media (min-width: 480px) and (max-width: 639px) { /* sm */ }

/* 大手機/小平板 */
@media (min-width: 640px) and (max-width: 767px) { /* md */ }

/* 平板 */
@media (min-width: 768px) and (max-width: 1023px) { /* lg */ }

/* 小桌面 */
@media (min-width: 1024px) and (max-width: 1279px) { /* xl */ }

/* 桌面 */
@media (min-width: 1280px) and (max-width: 1535px) { /* 2xl */ }

/* 大桌面 */
@media (min-width: 1536px) { /* 3xl */ }
```

## 流體文字系統

### 基礎文字大小

```css
/* 流體字體大小變數 */
--text-xs: clamp(0.75rem, 2vw, 0.875rem);     /* 12px - 14px */
--text-sm: clamp(0.875rem, 2.5vw, 1rem);      /* 14px - 16px */
--text-base: clamp(1rem, 3vw, 1.125rem);      /* 16px - 18px */
--text-lg: clamp(1.125rem, 3.5vw, 1.25rem);   /* 18px - 20px */
--text-xl: clamp(1.25rem, 4vw, 1.5rem);       /* 20px - 24px */
--text-2xl: clamp(1.5rem, 5vw, 2rem);         /* 24px - 32px */
--text-3xl: clamp(2rem, 6vw, 2.5rem);         /* 32px - 40px */
--text-4xl: clamp(2.5rem, 8vw, 3.5rem);       /* 40px - 56px */
```

### 標題文字優化

```css
/* 針對長者的更大字體 */
--heading-1: clamp(1.75rem, 6vw, 3rem);       /* 28px - 48px */
--heading-2: clamp(1.5rem, 5vw, 2.25rem);     /* 24px - 36px */
--heading-3: clamp(1.25rem, 4vw, 1.875rem);   /* 20px - 30px */
--heading-4: clamp(1.125rem, 3.5vw, 1.5rem);  /* 18px - 24px */
--heading-5: clamp(1rem, 3vw, 1.25rem);       /* 16px - 20px */
--heading-6: clamp(0.875rem, 2.5vw, 1.125rem); /* 14px - 18px */
```

## 流體間距系統

### 容器間距

```css
/* 流體容器間距 */
--space-xs: clamp(0.5rem, 1.5vw, 0.75rem);    /* 8px - 12px */
--space-sm: clamp(0.75rem, 2vw, 1rem);        /* 12px - 16px */
--space-md: clamp(1rem, 2.5vw, 1.5rem);       /* 16px - 24px */
--space-lg: clamp(1.5rem, 3vw, 2rem);         /* 24px - 32px */
--space-xl: clamp(2rem, 4vw, 3rem);           /* 32px - 48px */
--space-2xl: clamp(3rem, 6vw, 4rem);          /* 48px - 64px */
```

### 佈局間距

```css
/* 頁面佈局間距 */
--layout-padding: clamp(1rem, 4vw, 2rem);      /* 16px - 32px */
--layout-margin: clamp(1.5rem, 5vw, 3rem);    /* 24px - 48px */
--layout-gap: clamp(1rem, 3vw, 2rem);         /* 16px - 32px */
```

## 流體容器系統

### 內容容器

```css
/* 內容寬度限制 */
--container-xs: clamp(100%, 90vw, 20rem);      /* 320px max */
--container-sm: clamp(100%, 85vw, 24rem);      /* 384px max */
--container-md: clamp(100%, 80vw, 28rem);      /* 448px max */
--container-lg: clamp(100%, 75vw, 32rem);      /* 512px max */
--container-xl: clamp(100%, 70vw, 36rem);      /* 576px max */
--container-2xl: clamp(100%, 65vw, 42rem);     /* 672px max */
--container-3xl: clamp(100%, 60vw, 48rem);     /* 768px max */
--container-4xl: clamp(100%, 55vw, 56rem);     /* 896px max */
--container-5xl: clamp(100%, 50vw, 64rem);     /* 1024px max */
--container-6xl: clamp(100%, 45vw, 72rem);     /* 1152px max */
--container-7xl: clamp(100%, 40vw, 80rem);     /* 1280px max */
```

### 遊戲容器

```css
/* 遊戲專用容器 */
--game-container-xs: clamp(100%, 95vw, 18rem);  /* 288px max */
--game-container-sm: clamp(100%, 90vw, 22rem);  /* 352px max */
--game-container-md: clamp(100%, 85vw, 26rem);  /* 416px max */
--game-container-lg: clamp(100%, 80vw, 30rem);  /* 480px max */
--game-container-xl: clamp(100%, 75vw, 34rem);  /* 544px max */
--game-container-2xl: clamp(100%, 70vw, 38rem); /* 608px max */
```

## 觸控優化系統

### 觸控目標尺寸

```css
/* 長者友善觸控目標 */
--touch-target-min: 3.5rem;        /* 56px 最小觸控區域 */
--touch-target-comfort: 4rem;      /* 64px 舒適觸控區域 */
--touch-target-large: 4.5rem;      /* 72px 大型觸控區域 */

/* 根據斷點調整 */
@media (max-width: 479px) {
  --touch-target-min: 4rem;        /* 小螢幕加大 */
  --touch-target-comfort: 4.5rem;
  --touch-target-large: 5rem;
}
```

### 觸控區域類別

```css
/* 觸控優化類別 */
.touch-min {
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
}

.touch-comfort {
  min-height: var(--touch-target-comfort);
  min-width: var(--touch-target-comfort);
}

.touch-large {
  min-height: var(--touch-target-large);
  min-width: var(--touch-target-large);
}

/* 防止誤觸間距 */
.touch-safe {
  margin: var(--space-sm);
  position: relative;
}

.touch-safe::after {
  content: '';
  position: absolute;
  inset: calc(var(--space-xs) * -1);
  pointer-events: none;
}
```

## 橫屏豎屏自適應

### 方向偵測

```css
/* 豎屏優化 */
@media (orientation: portrait) {
  --orientation-padding: clamp(1rem, 3vw, 1.5rem);
  --orientation-margin: clamp(0.5rem, 2vw, 1rem);
}

/* 橫屏優化 */
@media (orientation: landscape) {
  --orientation-padding: clamp(0.5rem, 2vw, 1rem);
  --orientation-margin: clamp(0.25rem, 1vw, 0.5rem);
}

/* 小螢幕橫屏特殊處理 */
@media (orientation: landscape) and (max-height: 500px) {
  --orientation-padding: clamp(0.25rem, 1vw, 0.5rem);
  --orientation-margin: clamp(0.125rem, 0.5vw, 0.25rem);
}
```

### 佈局方向調整

```css
/* 橫屏並列佈局 */
.landscape-layout {
  display: flex;
  flex-direction: column;
}

@media (orientation: landscape) and (min-height: 600px) {
  .landscape-layout {
    flex-direction: row;
    align-items: stretch;
  }

  .landscape-layout > * {
    flex: 1;
  }
}
```

## 虛擬鍵盤和安全區域處理

### iOS 安全區域

```css
/* 安全區域填充 */
.safe-area-top {
  padding-top: max(var(--space-sm), env(safe-area-inset-top));
}

.safe-area-bottom {
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
}

.safe-area-left {
  padding-left: max(var(--space-sm), env(safe-area-inset-left));
}

.safe-area-right {
  padding-right: max(var(--space-sm), env(safe-area-inset-right));
}

/* 全安全區域 */
.safe-area-all {
  padding-top: max(var(--space-sm), env(safe-area-inset-top));
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
  padding-left: max(var(--space-sm), env(safe-area-inset-left));
  padding-right: max(var(--space-sm), env(safe-area-inset-right));
}
```

### 虛擬鍵盤處理

```css
/* 鍵盤出現時的調整 */
.keyboard-visible {
  padding-bottom: var(--keyboard-height, 0px);
}

/* 輸入框聚焦時的滾動處理 */
.input-focused {
  scroll-padding-bottom: calc(var(--keyboard-height, 0px) + var(--space-lg));
}

/* 防止內容被鍵盤遮擋 */
.keyboard-safe {
  min-height: calc(100vh - var(--keyboard-height, 0px));
  transition: min-height 0.3s ease;
}
```

## CSS 類別和組件結構

### 佈局容器類別

```css
/* 響應式容器 */
.container-fluid { width: 100%; }
.container-xs { max-width: var(--container-xs); margin: 0 auto; }
.container-sm { max-width: var(--container-sm); margin: 0 auto; }
.container-md { max-width: var(--container-md); margin: 0 auto; }
.container-lg { max-width: var(--container-lg); margin: 0 auto; }
.container-xl { max-width: var(--container-xl); margin: 0 auto; }
.container-2xl { max-width: var(--container-2xl); margin: 0 auto; }
.container-3xl { max-width: var(--container-3xl); margin: 0 auto; }

/* 遊戲容器 */
.game-container-xs { max-width: var(--game-container-xs); margin: 0 auto; }
.game-container-sm { max-width: var(--game-container-sm); margin: 0 auto; }
.game-container-md { max-width: var(--game-container-md); margin: 0 auto; }
.game-container-lg { max-width: var(--game-container-lg); margin: 0 auto; }
.game-container-xl { max-width: var(--game-container-xl); margin: 0 auto; }
.game-container-2xl { max-width: var(--game-container-2xl); margin: 0 auto; }
```

### 文字類別

```css
/* 流體文字類別 */
.text-fluid-xs { font-size: var(--text-xs); }
.text-fluid-sm { font-size: var(--text-sm); }
.text-fluid-base { font-size: var(--text-base); }
.text-fluid-lg { font-size: var(--text-lg); }
.text-fluid-xl { font-size: var(--text-xl); }
.text-fluid-2xl { font-size: var(--text-2xl); }
.text-fluid-3xl { font-size: var(--text-3xl); }
.text-fluid-4xl { font-size: var(--text-4xl); }

/* 標題類別 */
.heading-fluid-1 { font-size: var(--heading-1); font-weight: 700; }
.heading-fluid-2 { font-size: var(--heading-2); font-weight: 600; }
.heading-fluid-3 { font-size: var(--heading-3); font-weight: 600; }
.heading-fluid-4 { font-size: var(--heading-4); font-weight: 600; }
.heading-fluid-5 { font-size: var(--heading-5); font-weight: 600; }
.heading-fluid-6 { font-size: var(--heading-6); font-weight: 600; }
```

### 間距類別

```css
/* 流體間距類別 */
.space-fluid-xs { gap: var(--space-xs); }
.space-fluid-sm { gap: var(--space-sm); }
.space-fluid-md { gap: var(--space-md); }
.space-fluid-lg { gap: var(--space-lg); }
.space-fluid-xl { gap: var(--space-xl); }
.space-fluid-2xl { gap: var(--space-2xl); }

/* 內邊距類別 */
.p-fluid-xs { padding: var(--space-xs); }
.p-fluid-sm { padding: var(--space-sm); }
.p-fluid-md { padding: var(--space-md); }
.p-fluid-lg { padding: var(--space-lg); }
.p-fluid-xl { padding: var(--space-xl); }
.p-fluid-2xl { padding: var(--space-2xl); }

/* 外邊距類別 */
.m-fluid-xs { margin: var(--space-xs); }
.m-fluid-sm { margin: var(--space-sm); }
.m-fluid-md { margin: var(--space-md); }
.m-fluid-lg { margin: var(--space-lg); }
.m-fluid-xl { margin: var(--space-xl); }
.m-fluid-2xl { margin: var(--space-2xl); }
```

## 組件結構規範

### 響應式組件架構

```vue
<template>
  <div class="responsive-component">
    <!-- 手機版佈局 -->
    <div class="mobile-layout xs:sm:hidden">
      <slot name="mobile" />
    </div>

    <!-- 平板版佈局 -->
    <div class="tablet-layout hidden xs:sm:block md:lg:hidden">
      <slot name="tablet" />
    </div>

    <!-- 桌面版佈局 -->
    <div class="desktop-layout hidden md:lg:block">
      <slot name="desktop" />
    </div>
  </div>
</template>
```

### 遊戲組件結構

```vue
<template>
  <div class="game-responsive-wrapper">
    <!-- 遊戲容器 -->
    <div class="game-container-fluid">
      <!-- 遊戲標題區域 -->
      <header class="game-header">
        <h1 class="heading-fluid-2">遊戲標題</h1>
      </header>

      <!-- 遊戲內容區域 -->
      <main class="game-content">
        <!-- 豎屏佈局 -->
        <div class="portrait-layout">
          <slot />
        </div>

        <!-- 橫屏佈局 -->
        <div class="landscape-layout hidden portrait:block">
          <slot name="landscape" />
        </div>
      </main>

      <!-- 遊戲控制區域 -->
      <footer class="game-footer touch-safe">
        <button class="btn touch-comfort">操作按鈕</button>
      </footer>
    </div>
  </div>
</template>
```

## 實現優先級

1. **高優先級**: 流體文字系統、觸控優化、基礎容器
2. **中優先級**: 橫屏豎屏自適應、安全區域處理
3. **低優先級**: 進階動畫、特殊裝置優化

## 測試檢查清單

- [ ] 在所有斷點下測試佈局完整性
- [ ] 驗證觸控目標最小尺寸 (56px+)
- [ ] 檢查文字可讀性 (最小 16px)
- [ ] 測試橫屏豎屏切換
- [ ] 驗證虛擬鍵盤處理
- [ ] 檢查安全區域適配
- [ ] 測試不同瀏覽器相容性
- [ ] 驗證長者使用體驗

## 更新日誌

- v1.0.0: 初始流體設計系統
- 新增 7 斷點系統
- 實現 clamp() 流體縮放
- 優化長者觸控體驗
- 新增橫屏豎屏自適應
- 完善虛擬鍵盤處理