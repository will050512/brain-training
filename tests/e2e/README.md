# E2E / 視覺回歸測試 / E2E & Visual Regression

## 目標 / Goals
- 跨裝置互動流程與按鈕行為檢查
- 視覺回歸截圖
- 使用 localStorage + IndexedDB 資料種子

- Cross-device interaction flow and button behavior checks
- Visual regression snapshots
- Seed data via localStorage + IndexedDB

## 執行方式 / How to Run
```bash
npm run build
npm run preview
# 另一個終端執行
npm run test:e2e
```

## 更新快照 / Update Snapshots
```bash
npm run test:e2e:update
```

## 環境變數 / Environment Variables
- `PLAYWRIGHT_BASE_URL`：指定測試 URL（預設 `http://localhost:4173`）
- `PLAYWRIGHT_BASE_URL`: test base URL (default `http://localhost:4173`)

## 種子資料 / Seed Data
`tests/e2e/fixtures/seed.ts` 會預先寫入：
- localStorage：current user / assessment
- IndexedDB：users / settings / stats / sessions / dailyTraining / miniCog

`tests/e2e/fixtures/seed.ts` preloads:
- localStorage: current user / assessment
- IndexedDB: users / settings / stats / sessions / dailyTraining / miniCog

## 覆蓋流程 / Coverage
- Login / Onboarding
- Daily Challenge
- Single Game (ready screen)
- Assessment
- Settings
- Report + Weekly Report
