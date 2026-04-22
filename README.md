# Kumiko Font Editor

Kumiko Font Editor 是一個以瀏覽器為核心的字體編輯器，支援 UFO 專案匯入、IndexedDB 草稿儲存，以及透過 GitHub OAuth 與 Cloudflare Pages Functions 載入 GitHub 上的 UFO repo。

## 功能

- 匯入本地 UFO 專案資料夾並解析 `.ufo` 內容到 IndexedDB。
- 從 GitHub repo 載入 UFO 專案，透過 Cloudflare Pages Functions 代理 archive 下載。
- 透過 GitHub OAuth web flow 登入，提高 GitHub API 配額，並為後續 fork / commit / PR 流程打底。
- 編輯 glyph 路徑、節點、metrics，並保留 dirty glyph 狀態。
- 將草稿保存在瀏覽器 IndexedDB，方便重新開啟。

## 本地開發

只測前端 UI：

```bash
pnpm install
pnpm dev
```

如果要測 GitHub 登入、GitHub 載入或任何 `/functions` 路由，請改用 Cloudflare Pages Functions 本地模式：

```bash
cp .dev.vars.example .dev.vars
# 編輯 .dev.vars，填入 GitHub OAuth App 的值
pnpm cf:dev
```

`.dev.vars` 需要至少這些值：

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_SESSION_SECRET=...
GITHUB_OAUTH_SCOPE=public_repo read:user user:email
```

`GITHUB_SESSION_SECRET` 請使用夠長的隨機字串，Functions 會用它來簽署 GitHub session cookie。

## GitHub OAuth App 設定

請在 GitHub 建立 OAuth App，並設定：

- `Homepage URL`: 你的本地或正式站點網址
- `Authorization callback URL`: `https://你的網域/api/github/oauth/callback`

本地開發時可以先用：

- `Homepage URL`: `http://localhost:8788`
- `Authorization callback URL`: `http://localhost:8788/api/github/oauth/callback`

正式部署到 Cloudflare Pages 後，再把 callback URL 改成正式網域。

## Cloudflare Pages 部署

這個專案使用：

- 前端靜態輸出：`dist`
- Pages Functions：`functions/`

### Dashboard 設定

在 Cloudflare Pages 建立專案時：

- Framework preset: `None` 或 `Vite`
- Build command: `pnpm build`
- Build output directory: `dist`

不要在 Pages 專案中填 `npx wrangler deploy` 當 deploy command。  
這是 Workers 的 deploy 指令，不是 Pages。你剛剛看到的錯誤就是因為用了 `wrangler deploy`，它會去找 Worker entry point，然後報：

- `Missing entry-point to Worker script or to assets directory`

如果你是用 Pages Git integration，Cloudflare 只需要：

- clone repo
- run build command
- publish `dist`
- 自動套用 `functions/`

不需要額外的 deploy command。

### Pages 環境變數 / Secrets

請在 Cloudflare Pages 專案的 `Settings > Variables and Secrets` 設定：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_SESSION_SECRET`
- `GITHUB_OAUTH_SCOPE`

### CLI 部署

如果你想手動部署：

```bash
pnpm cf:deploy
```

這個 script 會執行：

```bash
pnpm build
npx wrangler pages deploy dist
```

如果你的 Pages project name 不是 `wrangler` 自動判斷到的名稱，請手動加上：

```bash
npx wrangler pages deploy dist --project-name <your-pages-project-name>
```

## 專案結構

- `src/components/Home.tsx`: 首頁、GitHub 登入與 GitHub repo 載入入口。
- `src/lib/githubAuth.ts`: 前端 GitHub session 操作。
- `src/lib/githubImport.ts`: 透過同源 `/api/github/*` 載入 GitHub repo archive。
- `src/lib/ufoFormat.ts`: UFO 解析、序列化與 IndexedDB 同步。
- `functions/api/github`: GitHub OAuth、viewer、repo metadata、archive proxy。
- `src/store/index.ts`: 全域狀態與 glyph 編輯資料模型。

## 下一步

- 將 GitHub OAuth session 接到 fork / blob / tree / commit / PR 流程。
- 將 GitHub token 改成更完整的 server-side session storage，而不只依賴 signed cookie。
- 擴充更多 UFO metadata 與非 glyph 檔案的 GitHub 回寫流程。
