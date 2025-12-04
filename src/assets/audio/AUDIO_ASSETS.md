# 遊戲音效資源說明文件

本文件說明遊戲音效的檔案規格、命名規則及放置位置，供美術/音效人員參考。

## 📂 目錄結構

```
src/assets/audio/
├── games/                    # 遊戲通用音效
│   ├── correct.ogg          # 答對音效
│   ├── correct.mp3          # 答對音效（備援）
│   ├── wrong.ogg            # 答錯音效
│   ├── wrong.mp3
│   ├── click.ogg            # 點擊音效
│   ├── click.mp3
│   ├── start.ogg            # 遊戲開始
│   ├── start.mp3
│   ├── end.ogg              # 遊戲結束
│   ├── end.mp3
│   ├── countdown.ogg        # 倒數音效
│   ├── countdown.mp3
│   ├── warning.ogg          # 時間警告
│   ├── warning.mp3
│   ├── combo.ogg            # 連擊音效
│   ├── combo.mp3
│   ├── perfect.ogg          # 完美答題
│   ├── perfect.mp3
│   ├── levelUp.ogg          # 升級音效
│   ├── levelUp.mp3
│   ├── bonus.ogg            # 獎勵音效
│   ├── bonus.mp3
│   ├── tick.ogg             # 滴答聲
│   ├── tick.mp3
│   ├── flip.ogg             # 翻牌音效
│   ├── flip.mp3
│   ├── match.ogg            # 配對成功
│   ├── match.mp3
│   ├── mismatch.ogg         # 配對失敗
│   └── mismatch.mp3
│
├── math-calc/               # 數學計算遊戲專屬音效（範例）
│   ├── number-pop.ogg
│   └── calculate.ogg
│
├── card-match/              # 翻牌配對遊戲專屬音效（範例）
│   ├── card-flip.ogg
│   └── card-match.ogg
│
└── stroop-test/             # Stroop 測試專屬音效（範例）
    └── color-select.ogg
```

## 📋 音效規格要求

### 檔案格式

| 格式 | 優先級 | 說明 |
|------|--------|------|
| `.ogg` | **優先** | Ogg Vorbis 格式，檔案小、品質好 |
| `.mp3` | **備援** | MP3 格式，相容性最佳 |

> ⚠️ **每個音效都需要同時提供 `.ogg` 和 `.mp3` 兩種格式！**

### 技術規格

| 參數 | 建議值 | 說明 |
|------|--------|------|
| 採樣率 | 44100 Hz | 標準 CD 品質 |
| 位元深度 | 16 bit | 標準品質 |
| 聲道 | Mono（單聲道） | 減少檔案大小 |
| 位元率 | 64-128 kbps | ogg/mp3 壓縮品質 |
| 檔案大小 | < 100 KB | 每個音效檔案 |
| 音量標準化 | -3 dB | 避免爆音 |

### 音效長度建議

| 音效類型 | 建議長度 | 說明 |
|----------|----------|------|
| 點擊/按鈕 | 50-100ms | 短促清脆 |
| 答對/答錯 | 150-300ms | 明確回饋 |
| 開始/結束 | 300-500ms | 較完整的提示 |
| 連擊/獎勵 | 200-400ms | 激勵效果 |
| 警告 | 150-200ms | 引起注意 |
| 背景/循環 | 3-10s | 可無縫循環 |

## 🎵 通用音效清單

以下是所有遊戲共用的音效，需優先製作：

### 必要音效（優先級 1）

| 音效 ID | 說明 | 音效風格建議 |
|---------|------|--------------|
| `correct` | 答對/正確 | 輕快上揚的電子音，明亮愉悅 |
| `wrong` | 答錯/錯誤 | 低沉短促的提示音，不刺耳 |
| `click` | 點擊/選擇 | 清脆的按鈕音效 |
| `start` | 遊戲開始 | 振奮人心的開場音 |
| `end` | 遊戲結束 | 完成感的結束音 |

### 重要音效（優先級 2）

| 音效 ID | 說明 | 音效風格建議 |
|---------|------|--------------|
| `countdown` | 倒數計時 | 緊張感的滴答聲或嗶聲 |
| `warning` | 時間警告 | 提醒注意的警示音 |
| `combo` | 連擊 | 遞進式的激勵音效 |
| `match` | 配對成功 | 和諧悅耳的成功音 |
| `mismatch` | 配對失敗 | 輕微的失敗提示 |

### 可選音效（優先級 3）

| 音效 ID | 說明 | 音效風格建議 |
|---------|------|--------------|
| `perfect` | 完美答題 | 華麗的獎勵音效 |
| `levelUp` | 升級 | 進步感的提示音 |
| `bonus` | 獎勵 | 驚喜的獎勵音效 |
| `tick` | 計時滴答 | 輕柔的計時聲 |
| `flip` | 翻牌 | 卡片翻轉的聲音 |

## 🎯 遊戲專屬音效

各遊戲可能需要專屬音效，請放置在對應的子資料夾：

### 數學計算 (math-calc)
- `number-pop.ogg` - 數字出現音效
- `calculate.ogg` - 計算音效

### 翻牌配對 (card-match)
- `card-flip.ogg` - 翻牌音效
- `card-match.ogg` - 配對成功音效

### Stroop 測試 (stroop-test)
- `color-select.ogg` - 顏色選擇音效

### 打地鼠 (whack-a-mole)
- `mole-appear.ogg` - 地鼠出現
- `mole-hit.ogg` - 擊中地鼠
- `bomb-explode.ogg` - 炸彈爆炸

### 聽覺記憶 (audio-memory)
- `note-do.ogg` ~ `note-do2.ogg` - 音符音效

## 🔧 轉換工具建議

### 使用 FFmpeg 轉換

```bash
# 轉換為 OGG（優先格式）
ffmpeg -i input.wav -c:a libvorbis -q:a 4 -ac 1 output.ogg

# 轉換為 MP3（備援格式）
ffmpeg -i input.wav -c:a libmp3lame -b:a 96k -ac 1 output.mp3

# 批次轉換資料夾內所有 WAV 檔案
for f in *.wav; do
  ffmpeg -i "$f" -c:a libvorbis -q:a 4 -ac 1 "${f%.wav}.ogg"
  ffmpeg -i "$f" -c:a libmp3lame -b:a 96k -ac 1 "${f%.wav}.mp3"
done
```

### 使用 Audacity

1. 開啟音效檔案
2. 選擇 `檔案` > `匯出` > `匯出為 OGG`
3. 品質設定 5-6（相當於 128kbps）
4. 重複步驟匯出 MP3 格式

## ⚠️ 注意事項

1. **無版權音效**：請確保使用的音效無版權問題，或已取得授權
2. **長者友善**：音效應清晰但不刺耳，考慮聽力較弱的使用者
3. **一致性**：同類型音效風格應保持一致
4. **測試**：在不同裝置上測試音效播放效果
5. **備援機制**：若音效檔案缺失，系統會自動使用 Web Audio API 合成備援音效

## 📝 更新日誌

| 日期 | 版本 | 說明 |
|------|------|------|
| 2024-12-04 | 1.0.0 | 初始版本 |

---

如有任何問題，請聯繫開發團隊。
