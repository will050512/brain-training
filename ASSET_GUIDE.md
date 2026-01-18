
**# 素材需求手冊 (Asset Requirement Manual)

本手冊旨在協助設計師與開發者快速替換 "PWA Brain Training" 應用程式中的視覺與聽覺素材。

## 1. 全域規範 (Global Standards)

* 圖片格式 (Image Formats):
* 圖示 (Icons/UI): 優先使用 .svg (向量圖)，確保在任何解析度下都不失真。
* 照片/背景 (Photos/Backgrounds): 使用 .webp (優先) 或 .png。
* 檔案命名 (Naming): 使用 kebab-case (小寫，連字號)，例如 card-back-red.svg。
* 深色模式適配: 若圖示包含黑色線條，請確保在深色背景下有白色描邊，或提供 icon-name-dark.svg 版本。

## 2. 系統 UI 素材 (System UI)

| 素材名稱 (Name) | 建議尺寸 (Size) | 格式 (Format) | 用途描述 (Description)                           | 路徑參考 (Path)            |
| --------------- | --------------- | ------------- | ------------------------------------------------ | -------------------------- |
| App Logo        | 512x512 px      | PNG/SVG       | PWA 安裝圖示、啟動畫面、首頁 Logo (需含透明背景) | /public/img/icons/         |
| Favicon         | 32x32 px        | ICO/PNG       | 瀏覽器分頁圖示                                   | /public/favicon.ico        |
| Empty State     | 300x300 px      | SVG           | 當無數據或列表為空時的插圖 (如：無遊戲紀錄)      | /src/assets/illustrations/ |
| Sync Icons      | 24x24 px        | SVG           | 同步狀態圖示 (雲端、成功打勾、失敗驚嘆號)        | /src/assets/icons/         |

## 3. 遊戲專屬素材 (Game Specific Assets)

以下列出主要遊戲所需的替換素材。

### 3.1. 記憶翻牌 (Memory Match)

* 路徑: /src/assets/games/memory/
* 數量需求: 困難模式需要 12 組不重複圖示。

| 素材                     | 尺寸       | 格式 | 說明                                    |
| ------------------------ | ---------- | ---- | --------------------------------------- |
| card-back.png            | 200x300 px | PNG  | 卡牌背面圖案 (統一花色)                 |
| icon-1.svg ~ icon-12.svg | 128x128 px | SVG  | 卡牌正面圖示 (動物、水果、幾何圖形皆可) |

### 3.2. 天平秤重 (Balance Scale)

* 路徑: /src/assets/games/balance/

| 素材                        | 尺寸       | 格式 | 說明                                          |
| --------------------------- | ---------- | ---- | --------------------------------------------- |
| scale-base.png              | 600x200 px | PNG  | 天平底座                                      |
| scale-pan.png               | 150x100 px | PNG  | 秤盤 (需左右對稱或兩個檔案)                   |
| weight-1.png ~ weight-5.png | 100x100 px | PNG  | 砝碼圖片 (需有明顯的大小或材質差異，如鐵、金) |

### 3.3. 數字連線 (Number Connect / Ascending)

* 路徑: /src/assets/games/number/

| 素材           | 尺寸         | 格式 | 說明                                          |
| -------------- | ------------ | ---- | --------------------------------------------- |
| bg-connect.png | 1920x1080 px | WEBP | 遊戲背景底圖 (建議低對比度，以免干擾數字閱讀) |
| node-bg.svg    | 64x64 px     | SVG  | 數字圓圈的背景 (若不使用 CSS 繪製)            |

### 3.4. 其他通用遊戲圖示

每個遊戲在「遊戲列表」中都需要一個縮圖。

* 路徑: /src/assets/games/thumbnails/
* 規格: 400x300 px (4:3 比例), .webp 或 .jpg。
* 命名: 與遊戲 ID 對應，例如 memory-match.webp, sudoku.webp。

## 4. 音效素材 (Audio Assets)

請確保音量標準化 (Normalize) 至 -3dB，以免爆音。

| 素材名稱     | 格式    | 長度      | 用途                            |
| ------------ | ------- | --------- | ------------------------------- |
| correct.mp3  | MP3/AAC | < 1 sec   | 答對時的清脆音效 (如：叮咚)     |
| wrong.mp3    | MP3/AAC | < 1 sec   | 答錯時的音效 (如：波波)         |
| level-up.mp3 | MP3/AAC | 2-3 sec   | 關卡完成或升級時的慶祝音效      |
| click.mp3    | MP3/AAC | < 0.5 sec | UI 按鈕點擊回饋 (短促、輕微)    |
| bgm-calm.mp3 | MP3/AAC | Loop      | (選用) 背景輕音樂，需可無縫循環 |

## 5. UI 色彩規範 (Color Palette for UX)

若要更換整體主題，請更新 tailwind.config.js 中的色彩定義。

| 語意名稱       | 預設色碼 (Light)   | 預設色碼 (Dark)    | 用途               |
| -------------- | ------------------ | ------------------ | ------------------ |
| primary        | #3B82F6 (Blue-500) | #60A5FA (Blue-400) | 主要按鈕、選中狀態 |
| background     | #FFFFFF (White)    | #111827 (Gray-900) | 頁面背景           |
| surface        | #F3F4F6 (Gray-100) | #1F2937 (Gray-800) | 卡片、輸入框背景   |
| text-primary   | #111827 (Gray-900) | #F9FAFB (Gray-50)  | 標題、主要內文     |
| text-secondary | #6B7280 (Gray-500) | #9CA3AF (Gray-400) | 次要資訊、說明文字 |

**
