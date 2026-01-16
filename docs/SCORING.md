# Scoring & Weights

This project standardizes all game results into a 0-100 score and a letter grade (S-F). The normalization lives in `src/services/scoreNormalizer.ts`.

## Core Principles

- **Cross-game fairness**: every game is normalized to 0-100.
- **Difficulty recognition**: harder settings earn a small multiplier.
- **Metrics first**: scores are derived from accuracy, speed, completion, and efficiency.

## Difficulty Multipliers

Applied after per-game normalization, then clamped to 0-100.

- Main difficulty:
  - easy: `0.95`
  - medium: `1.00`
  - hard: `1.05`
- Sub difficulty:
  - 1: `0.95`
  - 2: `1.00`
  - 3: `1.05`

Final multiplier = main * sub.

## Weight Profiles

Defined in `GAME_SCORE_CONFIGS`:

- reaction games emphasize **accuracy + speed + combo**
- completion games emphasize **completion + efficiency + speed**
- memory games emphasize **accuracy + combo**
- precision games emphasize **accuracy**

Adjustments should keep weights at or near 100 total to avoid distortions.
