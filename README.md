# Kumiko Font Editor

Kumiko Font Editor 是一個純前端的開源 CJK 字體協作平台。此專案專注於漢字部件編輯、Glyphs 檔案解析、IndexedDB 草稿儲存與互動式向量繪製。

- Kumiko Font Editor 可直接匯入 `.glyphs` 檔案，進行字形路徑與節點編輯，並支援部件檢索與專案草稿管理。
- Kumiko Font Editor is a frontend font collaboration tool that imports `.glyphs` files, edits glyph paths and nodes, and supports component search with project draft persistence.

## Features

- Supports loading glyph data from `.glyphs` files, parsing paths, nodes, and metrics.
- The left panel provides component search and glyph listing with IDS keyword filtering.
- The central canvas workspace provides visual path editing, node selection, movement, and tool switching.
- The right panel displays and adjusts glyph properties, metrics, and selected node information.
- Auto-save saves project drafts to IndexedDB, with a recent project list for reopening.

## Getting Started

```bash
pnpm install
pnpm dev
```

## Project Structure

- `src/main.tsx`: 應用程式入口。
- `src/App.tsx`: 主容器與佈局。
- `src/store/index.ts`: 全域狀態與資料模型。
- `src/components/LeftPanel.tsx`: 左側部件檢索面板。
- `src/components/CanvasWorkspace.tsx`: 中央畫布編輯區。
- `src/components/RightPanel.tsx`: 右側屬性面板。
- `src/lib/persistence.ts`: IndexedDB 專案草稿儲存。
- `src/lib/openstepParser.ts`: Glyphs 解析器。
- `src/canvas`: 畫布渲染層與視圖抽象。
- `src/tools`: 編輯工具與 SceneController。

## 未來規劃 / Future Work

- Add smarter CJK IDS search and component semantic analysis.
- Expand GitHub publishing workflow and offline sync.
- Optimize large glyph data loading and support more font formats.
