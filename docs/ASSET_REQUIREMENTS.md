# 素材需求規格書 (設計 + 音效)

本文件列出了設計師與音效師所需的缺失素材清單及交付規格。

## 目前狀態

專案內已加入**占位用**的 SVG 與音效（短音色），用於綁定與測試流程。正式素材交付後請直接覆蓋同名檔案即可。  
目前多數遊戲已接入圖片與音效，但仍有部分素材「已存在但未使用」或「需要擴充覆蓋」。

## 通用交付規格

### 圖片 (Images)

* **格式：** 首選 `svg`，必要時可接受 `png`/`webp`。
* **色彩模式：** sRGB。
* **命名規則：** 全小寫短橫線連接 (lowercase kebab-case)。
* **大小：** 盡可能將單一檔案大小控制在 200 KB 以下。

### 音訊 (Audio)

* **格式：** 需同時提供 `.ogg` (主要) 與 `.mp3` (備用)。
* **規格：** 單聲道 (Mono)、44.1 kHz、16-bit、標準化 (normalized) 至 -3 dB。
* **大小：** 單一檔案大小請控制在 100 KB 以下。

## 全域音效 (已提供占位)

**路徑位置：** `src/assets/audio/games/`

目前檔案已存在（占位短音色），正式素材交付後請直接覆蓋同名檔案。

* correct.ogg/mp3 (正確)
* wrong.ogg/mp3 (錯誤)
* click.ogg/mp3 (點擊)
* start.ogg/mp3 (開始)
* end.ogg/mp3 (結束)
* countdown.ogg/mp3 (倒數)
* warning.ogg/mp3 (警告)
* combo.ogg/mp3 (連擊)
* match.ogg/mp3 (配對成功)
* mismatch.ogg/mp3 (配對失敗)
* perfect.ogg/mp3 (完美)
* levelUp.ogg/mp3 (升級)
* bonus.ogg/mp3 (獎勵)
* tick.ogg/mp3 (計時聲)
* flip.ogg/mp3 (翻轉聲)

## 遊戲專屬音效 (已提供占位)

目前檔案已存在（占位短音色），正式素材交付後請直接覆蓋同名檔案。

* **whack-a-mole (打地鼠):** `mole-appear` (出現), `mole-hit` (被打中), `bomb-explode` (炸彈爆炸)
* **math-calc (數學計算):** `number-pop` (數字彈出), `calculate` (計算聲)
* **card-match (卡牌配對):** `card-flip` (翻牌), `card-match` (配對成功)
* **stroop-test (史楚普測驗):** `color-select` (顏色選擇)
* **audio-memory (聽覺記憶):** `note-do` 至 `note-do2` (音階)
* **rhythm-mimic (節奏模仿):** `beat` (或 `tap`) + `miss` (失誤)

## 圖片 - 已補齊占位

### Card Match (卡牌配對)

**路徑：** `src/assets/images/card-match/icons/`

* 已包含 12 個圖示（含 `car.svg`, `house.svg`, `book.svg`, `clock.svg`）。
* hard 模式已使用 12 個圖示（可直接覆蓋同名檔案）。

### Balance Scale (天平稱重)

**路徑：** `src/assets/images/balance-scale/`

* 已包含 `weight-1.svg` 至 `weight-5.svg`，UI 已使用全部砝碼。



### Gesture Memory (手勢記憶)

**路徑：** `src/assets/images/gesture-memory/`

* 已補齊 12 種手勢（`gesture-*.svg`）。
* 若需替換風格，請覆蓋同名檔案。

### Spot Difference (大家來找碴)

**路徑：** `src/assets/images/spot-difference/scenes/`

* 已提供 3 組占位場景（`scene-01` 至 `scene-03`）。
* 若需新增更多場景，請沿用同樣尺寸與命名規則。

### Number Connect (數字連連看)

**路徑：** `src/assets/images/number-connect/`

* `background.svg` 已接入 UI 背景（可視需求替換）。



### Pattern Reasoning (圖形推理)

**路徑：** `src/assets/images/pattern-reasoning/shapes/`

* 已補齊菱形/星形與額外色系。
* 若需替換風格，請覆蓋同名檔案。

### Rock Paper Scissors (剪刀石頭布)

**路徑：** `src/assets/images/rock-paper-scissors/`

* 可選 UI 素材：
* `vs.svg` (若之後加入對決畫面時使用；檔案已存在但尚未導入 UI)



### Instant Memory (瞬間記憶)

* **可選：** 風格一致的 0-9 數字圖塊組 (sprite set)，尚未提供。

### Audio Memory (聽覺記憶)

* **可選：** 用於聲音標籤的 `button` (按鈕) 圖示組 (若需要視覺強化)，尚未提供。

## 圖片 - 現有素材 (已使用)

* **whack-a-mole:** `mole.svg` (地鼠), `mole-hit.svg` (被擊中), `hole.svg` (洞), `bomb.svg` (炸彈)
* **balance-scale:** `scale.svg` (天平), `weight-1.svg` 至 `weight-5.svg` (砝碼)
* **card-match:** `card-back.svg` (卡背), `card-frame.svg` (卡框), icons (apple/banana/cat/dog/flower/moon/sun/tree)
* **poker-memory:** `card-back.svg` (卡背), suit icons (花色圖示)
* **maze-navigation:** `player.svg` (玩家), `exit.svg` (出口), `wall.svg` (牆), `path.svg` (路徑)
* **number-connect:** `node.svg` (節點), `line.svg` (連線)
* **number-connect:** `background.svg` (背景)
* **pattern-reasoning:** circle/square/triangle (red/green/blue)
* **rock-paper-scissors:** `rock.svg` (石頭), `paper.svg` (布), `scissors.svg` (剪刀)
* **clock-drawing:** `clock-face.svg` (鐘面), `reference.svg` (參考圖)

## 未導入或待確認

以下素材已存在但尚未完整導入 UI，或目前僅部分使用：

- **Rock Paper Scissors:** `vs.svg` 尚未使用（若新增對決畫面可導入）。
