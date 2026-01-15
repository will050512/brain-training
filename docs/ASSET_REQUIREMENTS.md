# 素材需求規格書 (設計 + 音效)

本文件列出了設計師與音效師所需的缺失素材清單及交付規格。

## 目前狀態

專案內已加入**占位用**的 SVG 與音效（短音色），用於綁定與測試流程。正式素材交付後請直接覆蓋同名檔案即可。

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

## 全域音效 (缺失)

**路徑位置：** `src/assets/audio/games/`

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

## 遊戲專屬音效 (缺失)

* **whack-a-mole (打地鼠):** `mole-appear` (出現), `mole-hit` (被打中), `bomb-explode` (炸彈爆炸)
* **math-calc (數學計算):** `number-pop` (數字彈出), `calculate` (計算聲)
* **card-match (卡牌配對):** `card-flip` (翻牌), `card-match` (配對成功)
* **stroop-test (史楚普測驗):** `color-select` (顏色選擇)
* **audio-memory (聽覺記憶):** `note-do` 至 `note-do2` (音階)
* **rhythm-mimic (節奏模仿):** `beat` (或 `tap`) + `miss` (失誤)

## 圖片 - 缺失 / 待新增

### Card Match (卡牌配對)

**路徑：** `src/assets/images/card-match/icons/`

* 需要額外 4 個圖示 (用於困難模式的 12 對卡牌)。
* **建議檔名：** `car.svg`, `house.svg`, `book.svg`, `clock.svg` (或任何風格一致的 4 個圖示)。

### Balance Scale (天平稱重)

**路徑：** `src/assets/images/balance-scale/`

* 需要數值更大的額外砝碼：
* `weight-4.svg`
* `weight-5.svg` (若砝碼數值有擴充則選用)



### Gesture Memory (手勢記憶)

**路徑：** `src/assets/images/gesture-memory/`

* 目前素材僅包含 上/下/左/右；遊戲共使用 12 種手勢。
* 需補齊以下手勢 ID 的圖示：
* `wave` (揮手), `thumbs-up` (讚), `thumbs-down` (倒讚), `peace` (比耶), `ok` (OK手勢), `fist` (拳頭), `point` (指), `clap` (拍手), `pray` (祈禱), `muscle` (肌肉/加油), `wave-bye` (再見), `call` (打電話)


* **建議檔名：** `gesture-wave.svg`, `gesture-thumbs-up.svg` 等。

### Spot Difference (大家來找碴)

**路徑：** `src/assets/images/spot-difference/scenes/`

* **缺少所有場景圖組。**
* **需求格式：** 每個場景需一組成對圖片，尺寸相同。
* **命名範例：**
* `scene-01-a.png` / `scene-01-b.png`
* `scene-02-a.png` / `scene-02-b.png`


* **建議尺寸：** 400x300 或 600x450，所有場景尺寸請保持一致。

### Number Connect (數字連連看)

**路徑：** `src/assets/images/number-connect/`

* 缺少背景圖：
* `background.svg` (低調的網格或圓點樣式)



### Pattern Reasoning (圖形推理)

**路徑：** `src/assets/images/pattern-reasoning/shapes/`

* 目前形狀僅包含 紅/綠/藍 的 圓形/方形/三角形。
* 遊戲使用了更多顏色與形狀。**缺失項目：**
* `diamond-*` (菱形), `star-*` (星形) (至少需包含 紅/綠/藍)
* 圓形/方形/三角形的額外顏色 (黃色 yellow, 紫色 purple, 橘色 orange, 藍綠色 teal, 粉色 pink)


* **建議命名：** `circle-yellow.svg`, `square-purple.svg`, `triangle-orange.svg`, `diamond-blue.svg`, `star-red.svg`。

### Rock Paper Scissors (剪刀石頭布)

**路徑：** `src/assets/images/rock-paper-scissors/`

* 可選 UI 素材：
* `vs.svg` (若之後加入對決畫面時使用)



### Instant Memory (瞬間記憶)

* **可選：** 風格一致的 0-9 數字圖塊組 (sprite set)。

### Audio Memory (聽覺記憶)

* **可選：** 用於聲音標籤的 `button` (按鈕) 圖示組 (若需要視覺強化)。

## 圖片 - 現有素材 (已使用)

* **whack-a-mole:** `mole.svg` (地鼠), `mole-hit.svg` (被擊中), `hole.svg` (洞), `bomb.svg` (炸彈)
* **balance-scale:** `scale.svg` (天平), `weight-1.svg` 至 `weight-3.svg` (砝碼)
* **card-match:** `card-back.svg` (卡背), `card-frame.svg` (卡框), icons (apple/banana/cat/dog/flower/moon/sun/tree)
* **poker-memory:** `card-back.svg` (卡背), suit icons (花色圖示)
* **maze-navigation:** `player.svg` (玩家), `exit.svg` (出口), `wall.svg` (牆), `path.svg` (路徑)
* **number-connect:** `node.svg` (節點), `line.svg` (連線)
* **pattern-reasoning:** circle/square/triangle (red/green/blue)
* **rock-paper-scissors:** `rock.svg` (石頭), `paper.svg` (布), `scissors.svg` (剪刀)
* **clock-drawing:** `clock-face.svg` (鐘面), `reference.svg` (參考圖)
