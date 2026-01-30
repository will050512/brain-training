# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-29 17:56 (Asia/Taipei)
**Commit:** 07b9277
**Branch:** main

## OVERVIEW
Elder-friendly cognitive training web app (Vue 3 + Vite + TypeScript) with games, assessments, daily training, and local-first data sync.

## STRUCTURE
```
./
├── src/                 # app code
│   ├── components/      # UI components (views + games + shared UI)
│   ├── games/           # game registry + core + logic
│   ├── services/        # data, scoring, sync, PWA, assets
│   ├── stores/          # Pinia stores
│   ├── composables/     # Vue composables
│   ├── views/           # route-level views
│   └── style.css        # design tokens + global styles
├── public/              # static assets + assets_manifest.json
├── docs/                # product/dev/design docs
├── .storybook/          # Storybook config
├── scripts/             # build helpers (generate-icons)
└── dist/ dev-dist/      # build artifacts
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App bootstrap | `src/main.ts` | DB init + migrations + game registration
| Routes & guards | `src/router/index.ts` | Auth + assessment gate
| Game registry | `src/games/index.ts` | Register all games
| Game core hooks | `src/games/core/` | Timer/state/score/audio
| Game logic | `src/games/logic/` | Pure logic + unit tests in `__tests__/`
| Game UI | `src/components/games/` | Vue SFC per game
| Shared UI | `src/components/ui/` | Reusable UI primitives
| Settings + A11y | `src/stores/settingsStore.ts` | Reduce motion, contrast, theme
| Local DB | `src/services/db.ts` | IndexedDB layer
| Sync (Sheets) | `src/services/googleSheetSyncService.ts` | Full sync flow
| Scoring | `src/services/scoreNormalizer.ts` + `docs/SCORING.md` | Normalize + rules
| Assets | `public/assets_manifest.json` + `src/services/assetLoader.ts` | Emoji fallback
| PWA | `vite.config.ts` + `src/composables/usePWA.ts` | Workbox + update flow
| Design system | `docs/DESIGN_SYSTEM.md` | Tailwind v4 + CSS vars

## CONVENTIONS
- Vue SFC uses `<script setup lang="ts">`.
- Tailwind v4 + CSS variables; tokens in `src/style.css`.
- Import alias `@` -> `src/` (Vite + TS paths).
- Tests focus on logic (`src/games/logic/__tests__/`).
- `npm run build` runs `vue-tsc -b` then `vite build`.
- PWA base is `/brain-training/` (affects assets + routing).

## ANTI-PATTERNS (THIS PROJECT)
- Do not use type suppression (`as any`, `@ts-ignore`, `@ts-expect-error`).
- Avoid heavy refactors when fixing bugs.
- Do not edit build artifacts (`dist/`, `dev-dist/`).
- Avoid hard-coded colors; prefer semantic CSS vars.
- Keep touch targets >= 44px for elder-friendly UX.

## UNIQUE STYLES
- Elder-friendly UX is primary: large fonts, clear layouts, reduced motion support.
- PWA + offline support; asset fallback to emoji when missing.

## COMMANDS
```bash
npm install
npm run dev
npm run build
npm run test:run
npm run storybook
```

## NOTES
- Asset manifest lives at `/brain-training/assets_manifest.json` when `base` is set.
- Logic tests are deterministic; UI tests are not used here.
