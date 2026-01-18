# PROJECT_STATUS.md

## A. Real Development Requirements
- Node.js (TypeScript-based project using Vue 3 and Vite)
- IndexedDB for local data storage (via `idb` package)
- Google Sheets API for optional data synchronization (consent-based, via `*SyncService.ts`)
- PWA capabilities (via `vite-plugin-pwa` and related components like `InstallPrompt.vue`)

## B. The "Living" Documentation

### Architecture Diagram
```
User -> Vue App -> Pinia Stores -> IndexedDB
           |
           +-> SyncStatusIndicator (Reusable Component)
           |
           +-> (Optional) Google Sheets API
```
Data flow: User interactions trigger Vue components, which update Pinia stores, persisting data to IndexedDB. Optional sync to Google Sheets is strictly gated by user consent settings.

### Key Features
- PWA brain training: 15 registered games, installable, offline-capable
- Data integrity: strict streak calculation and separate statistics for Daily vs. Free play
- Customization: full settings suite (font, contrast, motion, audio, theme)
- Privacy first: granular consent controls with strictly gated sync services
- Dark mode UI tuned with semantic palette overrides for legibility

### Known Issues
- None.

## C. Progress & Roadmap

### Current State
100% complete / Maintenance Mode: Core game registry, main navigation flow, PWA infrastructure, settings, stats, assets, and sync/privacy polish are implemented.

### Completed Features (Ralph Loop Cycles)
- Streak calculation enforces date continuity on local day boundaries
- Daily vs. free play statistics are tracked separately with UI filtering
- Settings version reads from the package.json build constant
- Settings UI exposes font size, high contrast, reduce motion, voice prompts, and haptic feedback
- Theme switching UI enabled with light/dark/system modes and system listener
- Time estimation copy aligned with daily training game counts
- Asset integration: Card Match uses 12 icons for hard mode, Balance Scale weights use 1-5 images, Number Connect uses background art
- Data sync status UI with manual sync trigger and outcome indicators
- Behavior tracking toggle gates all sync transmission
- Reusable sync status component and granular consent controls
- Dark mode contrast audited with semantic color overrides and updated surfaces

### Immediate Next Steps
- None.

## D. Upgrade Recommendations (The "Ralph" Standard)

### Maintenance
- Regular dependency audits
- Monitor Google Apps Script quotas

### Future Features
- Multi-user support: allow multiple profiles on a single device
- Social features: optional leaderboard sharing
