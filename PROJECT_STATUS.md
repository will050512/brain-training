# PROJECT_STATUS.md

## A. Real Development Requirements / 實際開發需求
- **Node.js**: No explicit version requirement in configs, but TypeScript ~5.9.3 suggests Node.js 18+ for compatibility.
- **Build Tools**: Vite 6.4.1 with Vue 3 plugin, TypeScript compilation.
- **Runtime Dependencies**:
  - Vue 3.5.24 with Pinia 3.0.4 for state management
  - Vue Router 4.6.3 for navigation
  - IndexedDB wrapper (`idb` 8.0.3) for local data storage
  - Google Sheets integration for optional data synchronization
  - External auth bridge (WebView/App) via `postMessage`/`BrainTrainingBridge`
  - PWA via `vite-plugin-pwa` 1.2.0 with Workbox caching
  - Chart rendering with `echarts` 6.0.0 and `vue-echarts` 8.0.1
  - PDF generation uses `jsPDF` (dependency `html2pdf.js` is not used in src)
- **External Services**: Google Sheets (consent-gated), Google Fonts (cached), optional Firebase App-side auth
- **Assets**: Audio (MP3/OGG), images (SVG/PNG), fonts (TTF) in public/ directory

- **Node.js**：設定檔未明確限定版本，但 TypeScript ~5.9.3 表示建議 Node.js 18+。
- **Build Tools**：Vite 6.4.1 + Vue 3 plugin + TypeScript。
- **Runtime Dependencies**：
  - Vue 3.5.24 + Pinia 3.0.4
  - Vue Router 4.6.3
  - IndexedDB wrapper (`idb` 8.0.3)
  - Google Sheets（可選同步）
  - 外部登入橋接（WebView/App）透過 `postMessage`/`BrainTrainingBridge`
  - PWA：`vite-plugin-pwa` 1.2.0 + Workbox
  - 圖表：`echarts` 6.0.0 + `vue-echarts` 8.0.1
  - PDF 產生採用 `jsPDF`（`html2pdf.js` 目前未在 src 使用）
- **外部服務**：Google Sheets（需同意）、Google Fonts（快取）、Firebase（在 App 端登入）
- **資產**：音效、圖片、字型皆在 public/ 與 src/assets

## B. The "Living" Documentation / 動態文件

### Architecture Diagram / 架構圖
```
User Interaction
    ↓
Vue Components (15 Game Components + UI Components)
    ↓
Pinia Stores (userStore, gameStore, settingsStore)
    ↓
Services Layer:
├── Database Service (IndexedDB via idb)
├── Sync Services (Google Sheets, consent-gated)
├── Game Logic Services (15 game logic modules)
├── Assessment & Analytics Services
├── PDF & Chart Generation Services
└── External Auth Bridge (WebView/App)
    ↓
IndexedDB (Local Storage) | Google Sheets (Optional Sync)
```

Data flow: User interactions trigger Vue components, updating Pinia stores. Data persists to IndexedDB locally. Optional sync to Google Sheets requires explicit user consent and handles failures gracefully.
資料流程：使用者互動更新 Vue components → Pinia stores → IndexedDB。本地優先，選配同步到 Google Sheets（需同意）。

### Key Features / 主要功能
- **PWA Brain Training Platform**: 15 cognitive games covering memory, attention, logic, reaction, coordination, and cognition.
- **User Management**: Profile creation, education years tracking, external auth bridge integration.
- **Granular Settings**: Font size, high contrast, reduce motion, audio prompts, haptics, theme switching.
- **Data Synchronization**: Consent-based Google Sheets sync for sessions, assessments, and user data.
- **Assessment Framework**: Mini-Cog assessment with PDF report generation.
- **Analytics & Recommendations**: Behavior analysis, decline detection, nutrition recommendations, adaptive difficulty.
- **Accessibility**: Responsive design, PWA installability, offline capability, semantic colors.
- **Privacy-First**: Explicit consent modals, data minimization, granular sync controls.

- **PWA 認知訓練平台**：15 款遊戲涵蓋記憶/注意/邏輯/反應/協調/認知。
- **使用者管理**：使用者建立、教育年數、外部登入橋接。
- **細緻設定**：字體、對比、減少動畫、語音提示、震動、主題切換。
- **資料同步**：需同意的 Google Sheets 同步（遊戲/評估/使用者）。
- **評估系統**：Mini-Cog + PDF 報告。
- **分析與建議**：行為分析、退化偵測、營養建議、難度自適應。
- **無障礙**：響應式、PWA、離線、語義色系。
- **隱私優先**：明確同意、最小化資料、細緻控管。

### Known Issues / 已知問題
- **Font Loading Failures**: PDF service errors if `public/fonts/NotoSansTC-Regular.ttf` is missing/corrupted.
- **Sync Service Errors**: Google Sheets sync failures are logged but do not block core flows.
- **External Auth Security**: The external auth bridge validates origin (same-origin, GitHub Pages, or null), but additional allowlists may be required for other hosts.
- **Complex Services**: Some services are large and could be simplified over time.

- **字型載入失敗**：若 `public/fonts/NotoSansTC-Regular.ttf` 缺失/損毀，PDF 會報錯。
- **同步錯誤**：Google Sheets 同步失敗會記錄，但不阻塞主流程。
- **外部登入安全**：橋接已做 origin 檢查（同源、GitHub Pages、null），其他 host 需手動加白名單。
- **服務模組複雜**：部分服務檔案過大，後續可拆分簡化。

## C. Progress & Roadmap / 進度與路線

### Current State / 目前狀態
All 15 games and core flows are implemented; PWA, settings, sync, assessment, and analytics are functional.
15 款遊戲與核心流程已落地；PWA、設定、同步、評估、分析皆可運作。

### Completed Features / 已完成項目
- Game Registry: All 15 games registered with configs and cognitive weights.
- UI Framework: Responsive layouts, navigation, modals, and PWA components.
- Data Layer: IndexedDB schema, migrations, and sync services.
- Assessment System: Mini-Cog implementation with PDF generation.
- Analytics Pipeline: Behavior tracking, decline detection, recommendation engines.
- External Integrations: Google Sheets sync and external auth bridge.

- 遊戲註冊：全部 15 款遊戲註冊與權重配置。
- UI 框架：響應式版型、導航、Modal、PWA 元件。
- 資料層：IndexedDB schema、migration、同步服務。
- 評估：Mini-Cog + PDF。
- 分析：行為追蹤、退化偵測、推薦引擎。
- 外部整合：Sheets 同步與外部登入橋接。

### Immediate Next Steps / 近期下一步
None explicitly tracked in repo docs.
目前無明確列出。

## D. Upgrade Recommendations / 升級建議

### Package Notes / 套件備註
- `vite-plugin-pwa` (1.2.0): consider updating for caching/security improvements.
- `html2pdf.js`: present in dependencies but not used in src; verify if still needed.

- `vite-plugin-pwa` (1.2.0)：可評估升級以改善快取與安全。
- `html2pdf.js`：相依存在但 src 未使用；請評估是否可移除。

### Architectural Refactors / 架構建議
- **Service Layer Consolidation**: split large services (e.g., `dailyTrainingService.ts`) into focused modules.
- **Error Handling Standardization**: align error boundaries and user-facing messages.
- **Performance Optimization**: lazy-load game components and refine SW caching.

- **服務分拆**：將大型服務（如 `dailyTrainingService.ts`）拆分。
- **錯誤處理一致化**：統一錯誤訊息與 UI 行為。
- **效能優化**：遊戲元件 lazy-load、調整 SW 快取策略。

### Future Enhancements / 未來可選
- Multi-user device sharing with profile switching
- Advanced analytics dashboard with trend visualization
- Social features for optional leaderboard sharing
- API backend migration from mock services to real endpoints

- 多使用者共享裝置與快速切換
- 更完整的趨勢儀表板
- 可選排行榜或社交分享
- 後端 API 取代 mock services
