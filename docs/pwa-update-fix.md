# PWA 更新流程修正

## 背景
先前的更新流程在 `needRefresh` 為 `true` 時，容易造成更新提示誤顯示，或在使用者不在前景時也彈出 UI。

## 修正重點
- 只有 `isUpdating` 為 `true` 時顯示全螢幕更新遮罩。
- 使用者在前景時才顯示更新 Banner。
- 使用者不在前景時自動套用更新。
- 更新中會隱藏 Banner，避免同時顯示兩種更新 UI。
- 離線就緒提示會在短時間後自動收起，使用者也可點擊關閉。

## 流程摘要
1. Service Worker 觸發 `onNeedRefresh` 後，標記 `needRefresh`。
2. 若使用者不在前景或尚未互動，立即呼叫 `applyUpdate`，並等待 `controllerchange` 重新整理。
3. 若使用者在前景，顯示更新 Banner；使用者點擊後套用更新。
4. 更新進行中顯示全螢幕遮罩，並隱藏 Banner。

## 工作日誌
- 盤點 `usePWA`、`App.vue` 更新遮罩與 Banner 顯示條件。
- 確認問題來源為檢查階段遮罩與 `needRefresh` 的阻擋行為。
- 調整為只在更新套用中顯示遮罩，並將更新提示改為前景 Banner。
- 補上前景/互動狀態判斷，讓非前景時自動套用更新。
- 新增 E2E 可用的測試 hook，便於 Playwright 驗證更新流程。

## 測試計畫摘要
- Playwright：無更新時不出現更新遮罩或 Banner。
- Playwright：前景使用中有更新時只出現 Banner，不阻擋操作。
- Playwright：非前景有更新時自動套用並在回到前景後可正常操作。

## 相關檔案
- `src/composables/usePWA.ts`
- `src/App.vue`
- `src/components/ui/PWAUpdateBanner.vue`
