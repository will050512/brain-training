# E2E / 視覺回歸測試

## 目標
- 跨裝置互動流程與按鈕行為檢查
- 視覺回歸截圖
- 使用 localStorage + IndexedDB 資料種子

## 執行方式
```bash
npm run build
npm run preview
# 另一個終端執行
npm run test:e2e
```

## 更新快照
```bash
npm run test:e2e:update
```

## 環境變數
- `PLAYWRIGHT_BASE_URL`：指定測試 URL（預設 `http://localhost:4173`）

## 種子資料
`tests/e2e/fixtures/seed.ts` 會預先寫入：
- localStorage：current user / assessment
- IndexedDB：users / settings / stats / sessions / dailyTraining / miniCog

## 覆蓋流程
- Login / Onboarding
- Daily Challenge
- Single Game (ready screen)
- Assessment
- Settings
- Report + Weekly Report
