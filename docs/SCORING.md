# Scoring & Weights / 評分與權重

This project standardizes all game results into a 0-100 score and a letter grade (S-F). The normalization lives in `src/services/scoreNormalizer.ts`.
本專案將所有遊戲結果標準化為 0-100 分與等第（S-F），邏輯在 `src/services/scoreNormalizer.ts`。

## Core Principles / 核心原則

- **Cross-game fairness**: every game is normalized to 0-100.
- **Difficulty recognition**: harder settings earn a small multiplier.
- **Metrics first**: scores are derived from accuracy, speed, completion, and efficiency.

- **跨遊戲公平**：所有遊戲統一 0-100。
- **難度加成**：困難設定有小幅倍率。
- **指標優先**：分數來自正確率、速度、完成度、效率。

## Difficulty Multipliers / 難度倍率

Applied after per-game normalization, then clamped to 0-100.
每遊戲先正規化，再套用倍率，最後 clamp 至 0-100。

- Main difficulty:
  - easy: `0.95`
  - medium: `1.00`
  - hard: `1.05`
- Sub difficulty:
  - 1: `0.95`
  - 2: `1.00`
  - 3: `1.05`

Final multiplier = main * sub.

## Weight Profiles / 權重配置

Defined in `GAME_SCORE_CONFIGS`:
定義於 `GAME_SCORE_CONFIGS`：

- reaction games emphasize **accuracy + speed + combo**
- completion games emphasize **completion + efficiency + speed**
- memory games emphasize **accuracy + combo**
- precision games emphasize **accuracy**

- 反應型：**accuracy + speed + combo**
- 完成型：**completion + efficiency + speed**
- 記憶型：**accuracy + combo**
- 精準型：**accuracy**

Adjustments should keep weights at or near 100 total to avoid distortions.
調整時請維持總和接近 100，避免失真。
