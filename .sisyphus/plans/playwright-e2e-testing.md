# Playwright Cross-Device E2E Testing with Visual Regression & CI

## TL;DR

> **Quick Summary**: Set up Playwright for cross-device E2E testing with visual regression on 6 device profiles (iPhone, Pixel, iPad, Android tablet, Desktop 1280/1920), covering 6 core user flows, with GitHub Actions CI integration.
> 
> **Deliverables**:
> - Playwright configuration with 6-device test matrix
> - State seeding fixtures for authenticated/assessment-completed users
> - E2E test suites for 6 flows (login/onboarding, daily-challenge, single-game, assessment, settings, report)
> - Visual regression snapshots committed to repo
> - GitHub Actions workflow for automated E2E runs
> - NPM scripts for local test execution
> 
> **Estimated Effort**: Medium-Large (2-3 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 9

---

## Context

### Original Request
Provide a step-by-step execution plan for Playwright-based cross-device UI flow testing with visual regression and CI. Requirements include:
- Test matrix: iPhone, Pixel, iPad, Android tablet, Desktop 1280px, Desktop 1920px
- Flows: login/onboarding, daily challenge, single game, assessment, settings, report
- Seed localStorage for test state
- Visual regression testing
- CI integration
- Configurable URLs (not hardcoded)

### Codebase Analysis Summary
**Existing Infrastructure:**
- Vitest for unit tests (19 test files in `src/games/logic/__tests__/`)
- Storybook available
- CI: GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)
- NO Playwright currently installed

**App State Management:**
- localStorage: `brain-training-current-user`, `brain-training-assessment-{userId}`
- IndexedDB: `brain-training-db` (users, settings, stats, gameSessions, etc.)
- Pinia stores: userStore, gameStore, settingsStore

**Build Configuration:**
- Base URL: `/brain-training/` (vite.config.ts)
- PWA enabled with service worker

### Design Decisions Applied
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Games to test | 6 representative games | Balance coverage vs execution time |
| Screenshot threshold | 0.5% | Tolerates anti-aliasing, catches real regressions |
| Snapshot storage | Commit to repo | Version-controlled, PR-reviewable |
| Parallelization | 4 CI workers | Optimal for GitHub runners |
| Browser engines | Chromium + WebKit | 95%+ user coverage |
| PWA handling | Disabled in tests | Avoids caching flakiness |
| Accessibility | Basic axe-core checks | Elder-friendly app compliance |

---

## Work Objectives

### Core Objective
Enable automated cross-device E2E testing with visual regression to catch UI regressions before they reach production, ensuring consistent user experience across all target devices.

### Concrete Deliverables
- `playwright.config.ts` - Multi-device configuration
- `e2e/fixtures/` - State seeding utilities
- `e2e/tests/` - 6 flow test files
- `e2e/__snapshots__/` - Visual regression baselines
- `.github/workflows/e2e.yml` - CI workflow
- `package.json` - Updated with Playwright scripts
- `docs/E2E_TESTING.md` - Documentation

### Definition of Done
- [ ] `npm run test:e2e` runs all tests successfully on all 6 device profiles
- [ ] `npm run test:e2e:ui` opens Playwright UI for debugging
- [ ] Visual regression snapshots captured for each flow × device
- [ ] CI workflow triggers on PR and blocks on failure
- [ ] CI stores test reports and failure screenshots as artifacts

### Must Have
- All 6 device profiles working (iPhone, Pixel, iPad, Android tablet, Desktop 1280, Desktop 1920)
- State seeding for authenticated + assessment-completed user
- Visual regression for key screens in each flow
- CI integration with artifact upload

### Must NOT Have (Guardrails)
- DO NOT hardcode URLs (use `baseURL` config)
- DO NOT test all 15 games (use 6-game subset)
- DO NOT mix unit tests with E2E (separate directories)
- DO NOT commit local-only config changes
- DO NOT skip mobile viewports in CI
- DO NOT leave flaky tests (add proper waits/assertions)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (Playwright not installed)
- **User wants tests**: YES (Tests-after - E2E tests ARE the deliverable)
- **Framework**: Playwright Test (`@playwright/test`)

### Automated Verification

Each TODO includes EXECUTABLE verification procedures:

**For Playwright Setup:**
```bash
npx playwright --version
# Assert: Outputs version like "Version 1.x.x"
```

**For Test Execution:**
```bash
npm run test:e2e -- --project="Desktop 1280"
# Assert: Exit code 0, all tests pass
```

**For Visual Regression:**
```bash
npm run test:e2e -- --update-snapshots
# Assert: Snapshots created in e2e/__snapshots__/
```

**For CI Workflow:**
```bash
# Dry-run validation
act -n -W .github/workflows/e2e.yml
# Assert: Workflow syntax valid
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Install Playwright & dependencies
└── Task 2: Create project directory structure

Wave 2 (After Wave 1):
├── Task 3: Create playwright.config.ts
├── Task 4: Create state seeding fixtures
└── Task 5: Create URL configuration utility

Wave 3 (After Wave 2):
├── Task 6: Implement login/onboarding flow tests
├── Task 7: Implement settings flow tests
├── Task 8: Implement assessment flow tests
└── (Task 6-8 can run in parallel)

Wave 4 (After Task 4 complete):
├── Task 9: Implement daily-challenge flow tests
├── Task 10: Implement single-game flow tests
├── Task 11: Implement report flow tests
└── (Task 9-11 require seeding, can run in parallel)

Wave 5 (After all flow tests):
├── Task 12: Generate baseline snapshots
└── Task 13: Create GitHub Actions workflow

Wave 6 (Final):
├── Task 14: Add NPM scripts to package.json
└── Task 15: Create documentation

Critical Path: Task 1 → Task 3 → Task 4 → Task 9 → Task 12 → Task 13
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 3, 6-11 | 1 |
| 3 | 1 | 4, 5, 6-11 | None |
| 4 | 1, 3 | 9, 10, 11 | 5 |
| 5 | 1, 3 | 6-11 | 4 |
| 6 | 2, 3, 5 | 12 | 7, 8 |
| 7 | 2, 3, 5 | 12 | 6, 8 |
| 8 | 2, 3, 5 | 12 | 6, 7 |
| 9 | 4, 5 | 12 | 10, 11 |
| 10 | 4, 5 | 12 | 9, 11 |
| 11 | 4, 5 | 12 | 9, 10 |
| 12 | 6-11 | 13 | None |
| 13 | 12 | 14 | None |
| 14 | 13 | 15 | None |
| 15 | 14 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Approach |
|------|-------|---------------------|
| 1 | 1, 2 | Sequential (npm install must complete first) |
| 2 | 3, 4, 5 | Parallel after config created |
| 3 | 6, 7, 8 | Parallel (independent flow tests) |
| 4 | 9, 10, 11 | Parallel (independent flow tests) |
| 5 | 12, 13 | Sequential (snapshots before CI) |
| 6 | 14, 15 | Sequential (docs after scripts) |

---

## TODOs

### Infrastructure Setup

- [ ] 1. Install Playwright & Dependencies

  **What to do**:
  - Install @playwright/test as dev dependency
  - Install @axe-core/playwright for accessibility testing
  - Run `npx playwright install` to download browser binaries
  - Verify installation with version check

  **Must NOT do**:
  - Do not install globally
  - Do not install all browsers (only chromium, webkit)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple package installation task
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for package installation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `package.json` - Existing devDependencies structure
  - Playwright docs: https://playwright.dev/docs/intro

  **Acceptance Criteria**:
  ```bash
  npx playwright --version
  # Assert: Outputs "Version 1.x.x"
  
  npm ls @playwright/test
  # Assert: Shows @playwright/test in devDependencies
  
  npm ls @axe-core/playwright
  # Assert: Shows @axe-core/playwright in devDependencies
  ```

  **Commit**: YES
  - Message: `chore(deps): add playwright and axe-core for e2e testing`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm ls @playwright/test`

---

- [ ] 2. Create Project Directory Structure

  **What to do**:
  - Create `e2e/` directory at project root
  - Create subdirectories: `e2e/fixtures/`, `e2e/tests/`, `e2e/__snapshots__/`
  - Add `.gitkeep` files to preserve empty directories
  - Create `e2e/tsconfig.json` for TypeScript support

  **Must NOT do**:
  - Do not place E2E tests in `src/` directory
  - Do not mix with unit tests in `src/games/logic/__tests__/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple directory creation task
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 6-11
  - **Blocked By**: None

  **References**:
  - Project root structure - existing `src/`, `.github/` directories

  **Acceptance Criteria**:
  ```bash
  ls -la e2e/
  # Assert: Contains fixtures/, tests/, __snapshots__/
  
  ls e2e/tsconfig.json
  # Assert: File exists
  ```

  **Commit**: YES (group with Task 3)
  - Message: `feat(e2e): create playwright test directory structure`
  - Files: `e2e/`, `e2e/tsconfig.json`

---

- [ ] 3. Create playwright.config.ts

  **What to do**:
  - Create `playwright.config.ts` at project root
  - Configure 6 device projects:
    - Desktop 1920 (Chromium, 1920x1080)
    - Desktop 1280 (Chromium, 1280x720)
    - iPhone 13 (WebKit, 390x844, touch, mobile UA)
    - Pixel 5 (Chromium, 393x851, touch, mobile UA)
    - iPad Pro 11 (WebKit, 834x1194, touch)
    - Android Tablet (Chromium, 800x1280, touch)
  - Configure `baseURL` from environment variable with fallback
  - Configure visual regression settings (threshold 0.5%)
  - Configure reporter (html, json)
  - Configure webServer to start Vite dev server
  - Disable service worker via route blocking

  **Must NOT do**:
  - Do not hardcode URLs
  - Do not include Firefox (optimize test time)
  - Do not set retries > 1 for local (flaky test masking)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Configuration file requires understanding of device emulation
  - **Skills**: [`playwright`]
    - `playwright`: Device configuration expertise

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (must complete before others)
  - **Blocks**: Tasks 4, 5, 6-11
  - **Blocked By**: Task 1

  **References**:
  - `vite.config.ts:139` - Base URL `/brain-training/`
  - Playwright devices: https://playwright.dev/docs/emulation#devices
  - Visual comparison: https://playwright.dev/docs/test-snapshots

  **Configuration Template**:
  ```typescript
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    testDir: './e2e/tests',
    snapshotDir: './e2e/__snapshots__',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : 2,
    reporter: [['html'], ['json', { outputFile: 'e2e-results.json' }]],
    use: {
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173/brain-training/',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    expect: {
      toHaveScreenshot: {
        maxDiffPixelRatio: 0.005, // 0.5% threshold
      },
    },
    projects: [
      // ... 6 device configurations
    ],
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173/brain-training/',
      reuseExistingServer: !process.env.CI,
    },
  });
  ```

  **Acceptance Criteria**:
  ```bash
  npx playwright test --list
  # Assert: Shows 6 projects (Desktop 1920, Desktop 1280, iPhone 13, Pixel 5, iPad Pro 11, Android Tablet)
  ```

  **Commit**: YES (group with Task 2)
  - Message: `feat(e2e): add playwright configuration with 6-device matrix`
  - Files: `playwright.config.ts`, `e2e/`

---

### Fixtures & Utilities

- [ ] 4. Create State Seeding Fixtures

  **What to do**:
  - Create `e2e/fixtures/auth.fixture.ts` with user seeding utilities
  - Implement `seedUnauthenticatedUser()` - clear all state
  - Implement `seedAuthenticatedUser(userId)` - set localStorage keys
  - Implement `seedAssessmentCompletedUser(userId)` - add assessment completion
  - Implement `seedUserWithGameHistory(userId, games)` - add game sessions
  - Create IndexedDB seeding helpers for complex state
  - Export as Playwright fixtures for easy test integration

  **Must NOT do**:
  - Do not create real users in production database
  - Do not use hardcoded user IDs that conflict with real users
  - Do not modify state after page navigation starts

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Requires understanding of app state management
  - **Skills**: [`playwright`]
    - `playwright`: Fixture API and page.addInitScript

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Tasks 9, 10, 11
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/router/index.ts:150-191` - Auth guard logic and localStorage keys
  - `src/stores/userStore.ts:269-271` - localStorage key names
  - `src/services/db.ts:219` - IndexedDB name `brain-training-db`

  **Fixture Pattern**:
  ```typescript
  // e2e/fixtures/auth.fixture.ts
  import { test as base, Page } from '@playwright/test';

  export const test = base.extend<{
    authenticatedPage: Page;
    assessmentCompletedPage: Page;
  }>({
    authenticatedPage: async ({ page }, use) => {
      const userId = `e2e-user-${Date.now()}`;
      await page.addInitScript((id) => {
        localStorage.setItem('brain-training-current-user', id);
        localStorage.setItem('brain-training-last-user', id);
      }, userId);
      await use(page);
    },
    assessmentCompletedPage: async ({ page }, use) => {
      const userId = `e2e-user-${Date.now()}`;
      await page.addInitScript((id) => {
        localStorage.setItem('brain-training-current-user', id);
        localStorage.setItem('brain-training-last-user', id);
        localStorage.setItem(`brain-training-assessment-${id}`, JSON.stringify({
          hasCompletedAssessment: true,
          completedAt: new Date().toISOString()
        }));
      }, userId);
      await use(page);
    },
  });

  export { expect } from '@playwright/test';
  ```

  **Acceptance Criteria**:
  ```bash
  # Create a simple test that uses fixture
  cat e2e/tests/fixture-test.spec.ts
  # Assert: Imports from fixtures, uses authenticatedPage
  
  npx playwright test fixture-test.spec.ts --project="Desktop 1280"
  # Assert: Test passes, localStorage seeded correctly
  ```

  **Commit**: YES
  - Message: `feat(e2e): add state seeding fixtures for auth and assessment`
  - Files: `e2e/fixtures/auth.fixture.ts`, `e2e/fixtures/index.ts`

---

- [ ] 5. Create URL Configuration Utility

  **What to do**:
  - Create `e2e/fixtures/urls.ts` with route constants
  - Map all routes from router (/, /login, /onboarding, /assessment, /games, etc.)
  - Create helper functions for dynamic routes (e.g., `/games/${gameId}`)
  - Ensure all paths respect base URL configuration

  **Must NOT do**:
  - Do not hardcode full URLs (use relative paths)
  - Do not duplicate route definitions from router

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple mapping task
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Tasks 6-11
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/router/index.ts:10-142` - All route definitions

  **Acceptance Criteria**:
  ```bash
  cat e2e/fixtures/urls.ts
  # Assert: Contains ROUTES object with all paths
  ```

  **Commit**: YES (group with Task 4)
  - Message: `feat(e2e): add URL configuration utility`
  - Files: `e2e/fixtures/urls.ts`

---

### Flow Tests (No Auth Required)

- [ ] 6. Implement Login/Onboarding Flow Tests

  **What to do**:
  - Create `e2e/tests/login-onboarding.spec.ts`
  - Test cases:
    - Login page renders correctly (visual snapshot)
    - Form validation (empty fields, invalid date)
    - Successful login redirects to onboarding/assessment
    - Onboarding flow completion
    - Welcome screen interactions
  - Include a11y checks with axe-core
  - Capture visual snapshots at key states

  **Must NOT do**:
  - Do not use real user credentials
  - Do not skip error state screenshots

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI flow testing with visual regression
  - **Skills**: [`playwright`]
    - `playwright`: Form interactions, navigation assertions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - `src/views/LoginView.vue` - Login form structure
  - `src/views/OnboardingView.vue` - Onboarding flow
  - `src/router/index.ts:21-37` - Login/Onboarding routes

  **Test Template**:
  ```typescript
  import { test, expect } from '@playwright/test';
  import AxeBuilder from '@axe-core/playwright';

  test.describe('Login and Onboarding Flow', () => {
    test('login page renders correctly', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('form')).toBeVisible();
      await expect(page).toHaveScreenshot('login-page.png');
    });

    test('login page passes accessibility checks', async ({ page }) => {
      await page.goto('/login');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    // ... more tests
  });
  ```

  **Acceptance Criteria**:
  ```bash
  npx playwright test login-onboarding.spec.ts --project="iPhone 13"
  # Assert: All tests pass
  
  ls e2e/__snapshots__/*login*
  # Assert: Snapshots generated for each device
  ```

  **Commit**: YES
  - Message: `feat(e2e): add login/onboarding flow tests with visual regression`
  - Files: `e2e/tests/login-onboarding.spec.ts`

---

- [ ] 7. Implement Settings Flow Tests

  **What to do**:
  - Create `e2e/tests/settings.spec.ts`
  - Test cases:
    - Settings page renders correctly (visual snapshot)
    - Sound toggle works
    - Theme/appearance settings
    - Accessibility settings (reduce motion, high contrast)
    - Settings persistence across refresh
  - Include a11y checks

  **Must NOT do**:
  - Do not test with auth-required state (settings page is public)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI toggle interactions
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - `src/views/SettingsView.vue` - Settings UI
  - `src/stores/settingsStore.ts` - Settings state management
  - `src/router/index.ts:129-136` - Settings route (no auth required)

  **Acceptance Criteria**:
  ```bash
  npx playwright test settings.spec.ts --project="Desktop 1920"
  # Assert: All tests pass
  ```

  **Commit**: YES (group with Task 6)
  - Message: `feat(e2e): add settings flow tests`
  - Files: `e2e/tests/settings.spec.ts`

---

- [ ] 8. Implement Assessment Flow Tests

  **What to do**:
  - Create `e2e/tests/assessment.spec.ts`
  - Use `authenticatedPage` fixture (requires auth, not assessment completion)
  - Test cases:
    - Assessment page loads for authenticated user
    - Assessment question progression
    - Timer functionality
    - Completion and result display
    - Redirect to games after completion
  - Visual snapshots at key assessment stages

  **Must NOT do**:
  - Do not skip assessment steps (test full flow)
  - Do not mock timer (test real timing behavior)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multi-step assessment flow
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - `src/views/AssessmentView.vue` - Assessment UI
  - `src/router/index.ts:39-47` - Assessment route (requiresAuth: true)

  **Acceptance Criteria**:
  ```bash
  npx playwright test assessment.spec.ts --project="iPad Pro 11"
  # Assert: All tests pass, assessment completion flow works
  ```

  **Commit**: YES (group with Tasks 6, 7)
  - Message: `feat(e2e): add assessment flow tests`
  - Files: `e2e/tests/assessment.spec.ts`

---

### Flow Tests (Auth + Assessment Required)

- [ ] 9. Implement Daily Challenge Flow Tests

  **What to do**:
  - Create `e2e/tests/daily-challenge.spec.ts`
  - Use `assessmentCompletedPage` fixture
  - Test cases:
    - Daily challenge page loads with game list
    - Game progress tracking
    - Navigation to individual games
    - Completion state and celebration
  - Visual snapshots for daily challenge states

  **Must NOT do**:
  - Do not test without assessment completion (will redirect)
  - Do not rely on specific game order (may vary)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI state testing
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `src/views/DailyChallengeView.vue` - Daily challenge UI
  - `src/router/index.ts:88-98` - Daily challenge route (requiresAssessment: true)

  **Acceptance Criteria**:
  ```bash
  npx playwright test daily-challenge.spec.ts --project="Pixel 5"
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `feat(e2e): add daily challenge flow tests`
  - Files: `e2e/tests/daily-challenge.spec.ts`

---

- [ ] 10. Implement Single Game Flow Tests

  **What to do**:
  - Create `e2e/tests/single-game.spec.ts`
  - Use `assessmentCompletedPage` fixture
  - Test 6 representative games:
    - whack-a-mole (reaction)
    - card-match (memory)
    - math-calc (logic)
    - pattern-reasoning (cognition)
    - audio-memory (attention)
    - stroop-test (coordination)
  - Test cases per game:
    - Game preview/instructions screen
    - Difficulty selection
    - Game start
    - Game completion/results
    - Score display
  - Visual snapshots for game states

  **Must NOT do**:
  - Do not test all 15 games (subset only)
  - Do not automate full gameplay (test key states only)
  - Do not test audio playback (use mocked audio)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Game UI testing
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `src/views/GamePlayView.vue` - Game play container
  - `src/views/GameSelectView.vue` - Game selection
  - `src/components/games/` - Individual game components
  - `src/router/index.ts:74-87` - Game routes

  **Acceptance Criteria**:
  ```bash
  npx playwright test single-game.spec.ts --project="Android Tablet"
  # Assert: All 6 games tested, screenshots captured
  ```

  **Commit**: YES (group with Task 9)
  - Message: `feat(e2e): add single game flow tests for 6 representative games`
  - Files: `e2e/tests/single-game.spec.ts`

---

- [ ] 11. Implement Report Flow Tests

  **What to do**:
  - Create `e2e/tests/report.spec.ts`
  - Use `assessmentCompletedPage` fixture with seeded game history
  - Test cases:
    - Report page loads with user data
    - Weekly report view
    - Chart/graph rendering (ECharts)
    - Data export functionality
  - Visual snapshots for report states

  **Must NOT do**:
  - Do not test with empty game history (seed data first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Data visualization testing
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 10)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `src/views/ReportView.vue` - Report UI
  - `src/views/WeeklyReportView.vue` - Weekly report
  - `src/router/index.ts:99-117` - Report routes

  **Acceptance Criteria**:
  ```bash
  npx playwright test report.spec.ts --project="Desktop 1280"
  # Assert: All tests pass, charts render correctly
  ```

  **Commit**: YES (group with Tasks 9, 10)
  - Message: `feat(e2e): add report flow tests with data visualization checks`
  - Files: `e2e/tests/report.spec.ts`

---

### Visual Regression & CI

- [ ] 12. Generate Baseline Snapshots

  **What to do**:
  - Run all tests with `--update-snapshots` flag
  - Generate baseline snapshots for all 6 devices
  - Review snapshots for correctness
  - Organize snapshots by device and flow
  - Add snapshots to git

  **Must NOT do**:
  - Do not generate snapshots on Windows (CI runs Linux)
  - Do not commit snapshots with obvious rendering issues

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual review required
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 6-11

  **References**:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots

  **Acceptance Criteria**:
  ```bash
  find e2e/__snapshots__ -name "*.png" | wc -l
  # Assert: Multiple snapshots exist (6 flows × 6 devices × multiple states)
  
  git status e2e/__snapshots__/
  # Assert: Shows new snapshot files to commit
  ```

  **Commit**: YES
  - Message: `feat(e2e): add baseline visual regression snapshots`
  - Files: `e2e/__snapshots__/**/*.png`

---

- [ ] 13. Create GitHub Actions Workflow

  **What to do**:
  - Create `.github/workflows/e2e.yml`
  - Configure:
    - Trigger on PR and push to main
    - Install dependencies (Node 20, npm ci)
    - Install Playwright browsers
    - Run E2E tests
    - Upload test report as artifact
    - Upload failure screenshots as artifact
  - Cache Playwright browsers for faster runs
  - Set appropriate timeout (30 min max)

  **Must NOT do**:
  - Do not run on every commit (only PR/main)
  - Do not block deployment workflow (separate workflow)
  - Do not upload full trace files (only on failure)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: YAML configuration task
  - **Skills**: [`git-master`]
    - `git-master`: CI workflow patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after snapshots)
  - **Blocks**: Task 14
  - **Blocked By**: Task 12

  **References**:
  - `.github/workflows/deploy.yml` - Existing CI structure
  - Playwright CI: https://playwright.dev/docs/ci-intro

  **Workflow Template**:
  ```yaml
  name: E2E Tests

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    e2e:
      runs-on: ubuntu-latest
      timeout-minutes: 30
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        - run: npm ci --legacy-peer-deps
        - run: npx playwright install --with-deps chromium webkit
        - run: npm run test:e2e
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: playwright-report
            path: playwright-report/
            retention-days: 7
        - uses: actions/upload-artifact@v4
          if: failure()
          with:
            name: failure-screenshots
            path: e2e/__snapshots__/
            retention-days: 7
  ```

  **Acceptance Criteria**:
  ```bash
  # Validate workflow syntax
  act -n -W .github/workflows/e2e.yml
  # Assert: No syntax errors
  
  cat .github/workflows/e2e.yml
  # Assert: Contains playwright install, test:e2e, upload-artifact
  ```

  **Commit**: YES
  - Message: `ci: add e2e test workflow with playwright`
  - Files: `.github/workflows/e2e.yml`

---

### Documentation & Scripts

- [ ] 14. Add NPM Scripts to package.json

  **What to do**:
  - Add scripts to package.json:
    - `test:e2e` - Run all E2E tests
    - `test:e2e:ui` - Open Playwright UI mode
    - `test:e2e:debug` - Run with headed browser
    - `test:e2e:update` - Update snapshots
  - Ensure scripts work on Windows and Unix

  **Must NOT do**:
  - Do not remove existing test scripts
  - Do not change existing Vitest configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON edit
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 (final)
  - **Blocks**: Task 15
  - **Blocked By**: Task 13

  **References**:
  - `package.json:6-16` - Existing scripts section

  **Scripts to Add**:
  ```json
  {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --headed --debug",
    "test:e2e:update": "playwright test --update-snapshots"
  }
  ```

  **Acceptance Criteria**:
  ```bash
  npm run test:e2e -- --help
  # Assert: Shows Playwright help
  
  npm run test:e2e:ui -- --help
  # Assert: Shows Playwright UI help
  ```

  **Commit**: YES
  - Message: `chore: add e2e test npm scripts`
  - Files: `package.json`

---

- [ ] 15. Create E2E Testing Documentation

  **What to do**:
  - Create `docs/E2E_TESTING.md`
  - Document:
    - Running tests locally
    - Writing new tests
    - Device matrix explanation
    - Updating snapshots
    - CI workflow
    - Troubleshooting common issues
  - Update main README with link to E2E docs

  **Must NOT do**:
  - Do not duplicate Playwright official docs
  - Do not include sensitive test data

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation task
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 (final)
  - **Blocks**: None
  - **Blocked By**: Task 14

  **References**:
  - `docs/README.md` - Existing docs index
  - `README.md` - Main project README

  **Acceptance Criteria**:
  ```bash
  ls docs/E2E_TESTING.md
  # Assert: File exists
  
  grep -c "playwright" docs/E2E_TESTING.md
  # Assert: > 0 (mentions playwright)
  ```

  **Commit**: YES
  - Message: `docs: add e2e testing guide`
  - Files: `docs/E2E_TESTING.md`, `README.md`

---

## Commit Strategy

| After Task(s) | Message | Files | Verification |
|---------------|---------|-------|--------------|
| 1 | `chore(deps): add playwright and axe-core for e2e testing` | package.json, package-lock.json | `npm ls @playwright/test` |
| 2, 3 | `feat(e2e): create playwright test infrastructure` | playwright.config.ts, e2e/ | `npx playwright test --list` |
| 4, 5 | `feat(e2e): add state seeding fixtures and URL config` | e2e/fixtures/ | Import test |
| 6, 7, 8 | `feat(e2e): add login, settings, assessment flow tests` | e2e/tests/*.spec.ts | `npx playwright test --project="Desktop 1280"` |
| 9, 10, 11 | `feat(e2e): add daily-challenge, game, report flow tests` | e2e/tests/*.spec.ts | `npx playwright test` |
| 12 | `feat(e2e): add baseline visual regression snapshots` | e2e/__snapshots__/ | `ls e2e/__snapshots__/` |
| 13 | `ci: add e2e test workflow with playwright` | .github/workflows/e2e.yml | Workflow validation |
| 14 | `chore: add e2e test npm scripts` | package.json | `npm run test:e2e -- --help` |
| 15 | `docs: add e2e testing guide` | docs/E2E_TESTING.md, README.md | File exists |

---

## Success Criteria

### Verification Commands
```bash
# All E2E tests pass on all devices
npm run test:e2e
# Expected: All tests pass, exit code 0

# Visual regression snapshots exist
find e2e/__snapshots__ -name "*.png" | wc -l
# Expected: > 50 snapshots

# CI workflow is valid
act -n -W .github/workflows/e2e.yml
# Expected: No errors

# Documentation exists
cat docs/E2E_TESTING.md | head -5
# Expected: Shows documentation content
```

### Final Checklist
- [ ] All 6 device profiles working (iPhone, Pixel, iPad, Android tablet, Desktop 1280, Desktop 1920)
- [ ] All 6 flows tested (login/onboarding, daily-challenge, single-game, assessment, settings, report)
- [ ] Visual regression snapshots committed
- [ ] CI workflow triggers and passes
- [ ] NPM scripts work locally
- [ ] Documentation complete
- [ ] No hardcoded URLs
- [ ] Accessibility checks included

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration with device matrix |
| `e2e/tsconfig.json` | TypeScript config for E2E tests |
| `e2e/fixtures/auth.fixture.ts` | State seeding fixtures |
| `e2e/fixtures/urls.ts` | URL configuration utility |
| `e2e/fixtures/index.ts` | Fixture exports |
| `e2e/tests/login-onboarding.spec.ts` | Login/onboarding flow tests |
| `e2e/tests/settings.spec.ts` | Settings flow tests |
| `e2e/tests/assessment.spec.ts` | Assessment flow tests |
| `e2e/tests/daily-challenge.spec.ts` | Daily challenge flow tests |
| `e2e/tests/single-game.spec.ts` | Single game flow tests |
| `e2e/tests/report.spec.ts` | Report flow tests |
| `e2e/__snapshots__/**/*.png` | Visual regression baselines |
| `.github/workflows/e2e.yml` | CI workflow |
| `docs/E2E_TESTING.md` | E2E testing documentation |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | Add @playwright/test, @axe-core/playwright, E2E scripts |
| `README.md` | Add link to E2E testing docs |

### Total: 14 new files + 2 modified files
