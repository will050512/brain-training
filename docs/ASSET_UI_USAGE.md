# 素材優先順序與 UI 使用位置

本文件整理「實際 UI 使用位置」與「素材優先補齊順序」，方便設計/製作交付。
以長者友善為優先：高對比、清楚辨識、避免過度細節。

## 優先順序（P0 → P2）

### P0（核心體驗，請優先補齊）
1. **遊戲圖示（Home / GameSelect / Report）**
   - 使用位置：首頁「快速開始」、遊戲清單、報告頁「各遊戲表現」
   - 來源清單：`public/assets_manifest.json`（用途 `game.icon.*`）
   - 需求：清楚辨識、單一主體、避免複雜背景

2. **Mini-Cog / Assessment 導引圖像**
   - 使用位置：評估流程、報告頁 Mini-Cog 區塊
   - 建議：簡潔、對比高，能讓長者快速理解用途

3. **警示 / 提醒類 Icon**
   - 使用位置：首頁提醒、報告警示、設定同步狀態
   - 建議：使用通用符號（警示、資訊、成功）

### P1（提升體驗）
1. **各遊戲內資源圖（可替換現有占位）**
   - 位置：各遊戲畫面內，如卡牌、圖形、物件
   - 參考：`docs/ASSET_REQUIREMENTS.md`、`ASSET_GUIDE.md`

2. **營養建議相關插圖**
   - 使用位置：Nutrition 頁、Report 營養區塊
   - 建議：柔和、健康、容易理解

### P2（擴充）
1. **空狀態插圖**
   - 使用位置：無資料時提示（報告、歷史紀錄）
   - 建議：簡潔、鼓勵性

2. **次要裝飾背景**
   - 使用位置：特定卡片或區塊背景
   - 注意：避免干擾閱讀

## UI 使用位置索引

### 全站常見
- **Header / Footer / 設定頁**：logo、通用 icon
- **同步狀態**：設定頁、首頁（後續 UI 版會顯示狀態摘要）

### Home（首頁）
- 快速開始：遊戲 icon
- 今日訓練：訓練狀態 icon
- 趨勢摘要：維度 icon（emoji fallback）

### GameSelect / GamePlay
- 遊戲列表：遊戲 icon
- 各遊戲內物件：參考 `ASSET_GUIDE.md`

### Report / WeeklyReport
- 各遊戲表現：遊戲 icon
- Mini-Cog 區塊：時鐘繪圖與評估相關 icon

### Assessment
- 測驗引導圖（反應/記憶/邏輯）

### Nutrition
- 個人化營養建議圖示

## 來源檔案
- `public/assets_manifest.json`：遊戲 icon 清單（務必同步更新）
- `ASSET_GUIDE.md`：實際使用素材路徑
- `docs/ASSET_REQUIREMENTS.md`：交付規格
