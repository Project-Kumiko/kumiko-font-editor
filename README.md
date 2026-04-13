# Kumiko Font Editor ⛩️

Kumiko Font Editor 是一個純前端的開源 CJK 字體協作平台。

## 架構與技術選型 (Architecture)
*   **視圖與組件 (UI Framework)**: React 19 + Vite
*   **排版與設計 (Design System)**: Chakra UI (v2.x)
*   **全域資料與狀態 (State Management)**: Zustand + Immer
*   **向量幾何與圖學 (Vector Graphics)**: Paper.js
*   **巨量 DOM 效能優化 (Virtual List)**: `react-virtuoso`

## 核心模組 (Modules)
1. **部件檢索系統**: 左側面板。負責過濾數萬個 CJK 字符與 IDS 檢索，渲染與 Store 即時綁定，利用 Virtual List 保證大型清單 60fps 順暢度。
2. **渲染引擎**: 中央工作區。橋接 Paper.js 與 Zustand。
3. **屬性面板與協作**: 右側面板。全域訂閱當前選取節點 (selectedNodes) 並允許精確的數值輸入微調。後續將擴充 IndexedDB 暫存與 Github API 發布流程。

## 開發指南 (Getting Started)

本專案使用 `pnpm` 進行套件管理。請確認環境後依序執行：

```bash
# 安裝依賴套件
pnpm install

# 啟動開發伺服器
pnpm dev
```

