# ASSET_GUIDE.md

本文件以「程式現況為準」，整理目前專案內實際使用的素材與路徑，方便替換與維護。

## 全域規範

- 圖片格式：優先使用 `svg`（向量）；必要時可使用 `png` 或 `webp`
- 命名規則：全小寫 kebab-case（例如 `card-back.svg`）
- 替換方式：直接覆蓋同名檔案即可

## PWA 與系統素材

- PWA 圖示輸出：`public/`（由 `scripts/generate-icons.js` 產生）
- App Logo 原始檔：`public/logo.svg`、`logo.png`

## 遊戲素材（已實際導入）

### Card Match（翻牌配對）

路徑：`src/assets/images/card-match/`

- `card-back.svg`（卡背）
- `card-frame.svg`（卡框）
- `icons/`（12 個圖示）
  - `apple.svg`
  - `banana.svg`
  - `book.svg`
  - `car.svg`
  - `cat.svg`
  - `clock.svg`
  - `dog.svg`
  - `flower.svg`
  - `house.svg`
  - `moon.svg`
  - `sun.svg`
  - `tree.svg`

難度對應：hard 模式需要 12 組圖示（已符合）。

### Balance Scale（天平秤重）

路徑：`src/assets/images/balance-scale/`

- `scale.svg`（天平本體）
- `weight-1.svg` ～ `weight-5.svg`（砝碼 1~5）

### Number Connect（數字連連看）

路徑：`src/assets/images/number-connect/`

- `background.svg`（背景）
- `node.svg`（節點）
- `line.svg`（連線，保留備用）

### Maze Navigation（迷宮導航）

路徑：`src/assets/images/maze-navigation/`

- `wall.svg`（牆）
- `path.svg`（路徑）
- `player.svg`（玩家）
- `exit.svg`（出口）

### Clock Drawing（時鐘繪圖）

路徑：`src/assets/images/clock-drawing/`

- `clock-face.svg`
- `reference.svg`

### Gesture Memory（手勢記憶）

路徑：`src/assets/images/gesture-memory/`

- `gesture-*.svg`（12 種手勢）
- `hand-*.svg`（方向提示）

### Pattern Reasoning（圖形推理）

路徑：`src/assets/images/pattern-reasoning/shapes/`

- `circle-*.svg`、`square-*.svg`、`triangle-*.svg`、`diamond-*.svg`、`star-*.svg`

### Rock Paper Scissors（剪刀石頭布）

路徑：`src/assets/images/rock-paper-scissors/`

- `rock.svg`、`paper.svg`、`scissors.svg`
- `vs.svg`（目前未導入 UI）

### Whack-a-mole（打地鼠）

路徑：`src/assets/images/whack-a-mole/`

- `mole.svg`、`mole-hit.svg`、`hole.svg`、`bomb.svg`、`hammer.svg`

### Poker Memory（撲克記憶）

路徑：`src/assets/images/poker-memory/`

- `card-back.svg`
- `suits/`：`spade.svg`、`heart.svg`、`diamond.svg`、`club.svg`

## 音效素材

路徑：`src/assets/audio/games/`

音效檔案以 `ogg`（主） + `mp3`（備）為主，遊戲會自動載入對應名稱檔案。  
詳細清單請見：`docs/ASSET_REQUIREMENTS.md` 與 `src/assets/audio/README.md`
