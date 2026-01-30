# Draft: UI/UX Cross-Platform Test Plan

## Requirements (confirmed)
- Platform: Vue3/Vite PWA app for elder-friendly cognitive training
- Target platforms: iOS, Android, Desktop
- Testing tool: Playwright (required)
- Focus: Button interactions, UI/UX flows, no interference between actions

## Research Findings

### App Structure Discovered
**Routes (11 views):**
1. `/` - Home (首頁) - default layout
2. `/login` - Login (登入) - fullscreen layout
3. `/onboarding` - Onboarding (歡迎) - fullscreen layout
4. `/assessment` - Assessment (能力評估) - app layout, requires auth
5. `/games` - Game Select (選擇遊戲) - requires auth + assessment
6. `/games/:gameId` - Game Play (遊戲中) - game layout, fullscreen
7. `/daily-challenge` - Daily Challenge (每日挑戰) - requires auth + assessment
8. `/report` - Training Report (訓練報告) - requires auth
9. `/weekly-report` - Weekly Report (週報告) - requires auth
10. `/nutrition` - Nutrition (營養建議) - requires auth
11. `/settings` - Settings (設定) - default layout

**Games (15 registered):**
1. whack-a-mole (打地鼠)
2. balance-scale (天平比重)
3. card-match (翻牌配對)
4. stroop-test (Stroop測試)
5. maze-navigation (皇家花園迷宮)
6. spot-difference (找不同)
7. math-calc (加減乘除)
8. instant-memory (瞬間記憶)
9. poker-memory (撲克記憶)
10. rock-paper-scissors (猜拳遊戲)
11. gesture-memory (手勢記憶)
12. number-connect (數字連連看)
13. pattern-reasoning (圖形推理)
14. audio-memory (聽覺記憶)
15. rhythm-mimic (節奏模仿)

**UI Components (24 shared):**
- BaseButton, BaseCard, BaseInput
- Modals: ConsentModal, WelcomeModal, TrainingCompleteModal, etc.
- Navigation: MobileBottomNav
- PWA: PWAUpdateBanner, InstallPrompt
- Progress/Status: CircularProgress, WeekCalendar, SyncStatusIndicator

**Key Interaction Patterns:**
- Elder-friendly: Large touch targets (>=44px), clear layouts
- Supports `prefers-reduced-motion`
- Touch + mouse interactions
- PWA with offline support

### Test Infrastructure
- Existing: Unit tests with Vitest for game logic
- Missing: No Playwright E2E tests found
- No playwright.config.ts exists

## Open Questions
- [ ] Test environment URL (localhost:5173? staging? production?)
- [ ] Authentication handling (test users? mock data?)
- [ ] Device availability for real device testing vs emulation only
- [ ] Priority: Which user journeys are most critical?
- [ ] CI/CD integration requirements?
- [ ] Visual regression needs (screenshot comparison)?
- [ ] Accessibility testing depth (WCAG compliance level)?

## Scope Boundaries
- INCLUDE: TBD after interview
- EXCLUDE: TBD after interview

## Technical Decisions
- Tool: Playwright (confirmed by user)
- Device coverage approach: TBD (emulation vs real devices)
