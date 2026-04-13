# Kumiko Font Editor ⛩️

Kumiko Font Editor 是一個純前端的開源 CJK 字體協作平台。主要採用 Hybrid 架構：以 React + Zustand 作為 UI 與狀態管理，並將 HTML5 `<canvas>` (搭配 Paper.js) 封裝為受控的渲染引擎，專為超大型 `.glyphs` (v3) 檔案的檢視與編輯而生。

## 架構與技術選型 (Architecture)
*   **視圖與組件 (UI Framework)**: React 19 + Vite
*   **排版與設計 (Design System)**: Chakra UI (v2.x)
*   **全域資料與狀態 (State Management)**: Zustand + Immer
*   **向量幾何與圖學 (Vector Graphics)**: Paper.js
*   **巨量 DOM 效能優化 (Virtual List)**: `react-virtuoso`

## 三大核心模組 (Modules)
1. **Module A (部件檢索系統)**: 左側面板。負責過濾數萬個 CJK 字符與 IDS 檢索，渲染與 Store 即時綁定，利用 Virtual List 保證大型清單 60fps 順暢度。
2. **Module B (渲染引擎 Canvas)**: 中央工作區。橋接 Paper.js 與 Zustand。實作了最嚴格的效能守則：**拖曳時僅更新繪圖 (Canvas) 層觀看，放開鼠標時才將結果持久化派發給 Zustand**，避免連續觸發 React 狀態樹更新造成 DOM 卡頓。
3. **Module C (屬性面板與協作)**: 右側面板。全域訂閱當前選取節點 (selectedNodes) 並允許精確的數值輸入微調。後續將擴充 IndexedDB 暫存與 Github API 發布流程。

## 開發指南 (Getting Started)

本專案使用 `pnpm` 進行套件管理。請確認環境後依序執行：

```bash
# 安裝依賴套件
pnpm install

# 啟動開發伺服器
pnpm dev
```

接著在瀏覽器打開 `http://localhost:5173` 即可進行測試與開發。
