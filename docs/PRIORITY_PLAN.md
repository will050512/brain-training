# Priority Plan + Modification Checklist

This is a prioritized implementation plan with itemized changes.

## P0 (High Priority - Behavior/UX)
1) Orientation consistency
- Unify orientation detection using `useResponsive` in all game components.
- Apply `game-root` class and small-landscape compact rules for all games.
- Ensure safe-area padding and no critical UI overlap in landscape (status bars + controls).

2) Difficulty wiring (sub-difficulty effect)
- Use `settingsStore` subDifficulty to adjust per-game configs.
- Implement `adjustSettingsForSubDifficulty` usage across game configs.
- Persist per-game difficulty settings in store and apply on game start.

3) Audio pipeline
- Provide missing global audio files in `src/assets/audio/games/`.
- Add per-game audio hooks for special events (whack-a-mole hit, card flip/match, rhythm beat, audio-memory notes).

## P1 (Medium Priority - Visual Consistency)
4) Asset usage for games with existing images
- whack-a-mole: use mole/hole/bomb SVGs.
- balance-scale: use scale + weight SVGs (fallback to emoji if missing weight).
- card-match: use card-back + icon SVGs, fallback to emoji for extra pairs.
- poker-memory: use card-back + suit SVGs.
- maze-navigation: use wall/path/player/exit SVGs.
- number-connect: use node SVG background.
- pattern-reasoning: use shape SVGs where available, fallback to text.
- clock-drawing: use clock-face + reference assets.
- rock-paper-scissors: use hand SVGs.

5) Missing image assets
- Provide new assets listed in `docs/ASSET_REQUIREMENTS.md`.
- Swap fallback emoji -> images once available.

## P2 (Polish / Accessibility)
6) Visual polish
- Add subtle backgrounds for game boards.
- Normalize typography scale for landscape.
- Ensure touch targets >= 56px.

7) Accessibility
- Add non-audio cues for hearing-impaired (visual pulses).
- Add high-contrast palette option in game UI.

## Step-by-Step Change List (per game)

### Whack-a-mole
- Replace emoji with SVG assets in holes.
- Add compact landscape spacing.
- Add per-event audio hooks (mole-appear, mole-hit, bomb-explode).

### Balance Scale
- Replace weight emoji with weight SVGs (fallback for missing weights).
- Add scale background asset.
- Compact layout in landscape.

### Card Match
- Replace emoji icons with SVG icons and card-back.
- Add missing 4 icons for hard mode.
- Compact layout in landscape.

### Poker Memory
- Replace suit glyphs with SVG suit icons + card-back.
- Compact layout in landscape.

### Maze Navigation
- Replace wall/path backgrounds + player/exit icons with SVG.
- Compact layout in landscape.

### Number Connect
- Use node SVG as button background.
- Add background SVG when available.
- Compact layout in landscape.

### Pattern Reasoning
- Use shape SVGs for circle/square/triangle where available.
- Add missing shapes/colors for full parity.
- Compact layout in landscape.

### Rock Paper Scissors
- Use SVGs for rock/paper/scissors.
- Add VS icon if needed.
- Compact layout in landscape.

### Clock Drawing
- Use clock-face SVG as background.
- Display reference SVG for instruction.
- Compact layout in landscape.

### Audio Memory / Rhythm Mimic / Instant Memory / Math Calc / Stroop Test / Gesture Memory / Spot Difference
- Add `game-root` + compact landscape layout.
- Implement missing audio assets.
- Replace emoji with images once assets are delivered (see asset requirements).

