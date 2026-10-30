# 10 — Implementation Status

> Comparing detiq-browser current codebase vs Strawberry Browser v0.1.77 (reverse-engineered ASAR).

---

## What's Built (Done)

### Core Scaffold
- **Electron + Vite + React + TypeScript** — electron-vite 3, React 19, Tailwind 4, strict TypeScript
- **Frameless window** — `titleBarStyle: hidden`, macOS traffic lights at `x:16 y:16`, full drag region
- **Dev/prod build pipeline** — `electron-vite dev`, `electron-builder` for Mac DMG + zip

### Companion System
- **9 AI companion profiles** — Sales Sam, Research Ria, Developer Dev, Operations Owen, Marketing Maya, Support Sol, Executive Eva, Talent Ren, Finance Finn — each with `id`, `role`, `summary`, `about`, `templateInstructions`, `visualSeed`, `defaultChatMode`, and brand `color`
- **Multi-model AI engine** (`src/main/companion/engine.ts`) — routes to Anthropic Claude (default: `claude-sonnet-4-6`) or OpenAI GPT based on model ID prefix; up to 50 agentic steps per session; `AbortController` per session for cancellation
- **Agentic tool set** — `navigate`, `click`, `type`, `extract`, `scroll`, `request_approval`, `task_complete` all wired to real WebContents execution
- **CompanionSidebar** (`src/renderer/src/components/companion/CompanionSidebar.tsx`) — companion picker dropdown, quick suggestions, streaming action log, stop button, per-companion message reset
- **CompanionWorkspace** (`src/renderer/src/components/companion/CompanionWorkspace.tsx`) — full-screen companion mode with role-specific suggestion sets, about message on first open, live action trace

### Memory
- **File-based markdown memory** (`src/main/memory/file-memory.ts`) — per-companion `memory.md` at `userData/memory/companions/<id>/memory.md`; shared `userData/memory/shared/global.md`; `buildMemoryContext()` merges both for AI context
- **IPC exposed** — `memory:read`, `memory:write`, `memory:readShared`, `memory:writeShared`

### Browser Engine
- **webview-tag tab browsing** — `WebViewArea.tsx` renders `<webview>` per tab, hidden when not active; tabs auto-register their `webContentsId` via `browser:registerTab` IPC on `dom-ready`
- **Page state capture** — `capturePageState()` runs `executeJavaScript` to pull `innerText` (5k chars) and up to 100 interactive elements (selectors, labels, types)
- **Back / forward / refresh / navigate** — all wired as IPC handlers in `src/main/ipc/handlers.ts`
- **Screenshot IPC** — `browser:screenshot` calls `wc.capturePage()` → base64 data URL (IPC defined, not yet surfaced in UI)

### Routines
- **node-cron scheduler** (`src/main/routines/scheduler.ts`) — starts on app ready, loads all enabled `schedule`-type routines from SQLite, runs them headlessly via `runCompanion`; CRUD via IPC (`routines:create`, `routines:delete`, `routines:toggle`, `routines:list`)

### UI / Layout
- **Arc-style left sidebar** (`LeftNav.tsx`) — 208px, vertical tabs with favicon + spinner, companion list with color-coded indicators, Home + Settings rows, New Tab button
- **Homepage** (`HomePage.tsx`) — greeting, search bar (URL or Google fallback), ⌘K focus shortcut, quick action chips, 3-column companion discovery grid with role badge + hover glow
- **BrowserLayout** — mode state machine: `home | browser | companion:<id>` routing
- **AddressBar** — URL display + back/forward/refresh controls via IPC

### Storage
- **SQLite via better-sqlite3** — WAL mode, FK enabled; tables: `chat_sessions`, `chat_messages`, `routines`, `companion_memory` (with `embedding BLOB` column), `browser_history`; indexes on session, companion, visited_at
- **Drizzle ORM installed** — schema ready, not yet used for queries (raw SQL in db.ts)

---

## What Strawberry Has That We Don't (Gaps)

### Architecture
- **WebContentsView vs `<webview>` tag** — Strawberry manages tabs as `WebContentsView` objects in the main process. The `<webview>` tag is deprecated in Electron 28+ and has sandboxing, CDP, and IPC limitations.
- **Nx monorepo** — Strawberry splits concerns across `@reflect/*` packages (`chat-loop`, `companions`, `scheduling`, `optmem`, `skills`, etc.). We're a flat app.

### Memory & Intelligence
- **sqlite-vec vector search (OptMem)** — `sqlite-vec` is installed in `package.json` but not initialized. Strawberry embeds every memory note and runs semantic search over `companion_memory`. We do only string reads.
- **Profile context injection with token limit** — Strawberry enforces an ~1800-token cap on injected profile/memory context. We inject nothing into the system prompt at inference time.
- **Recall prefetch** — Strawberry pre-fetches relevant memories before each AI call. We read memory on demand only when explicitly asked.

### Avatar & Identity
- **Visual seed avatar system** — `visualSeed` fields exist on our profiles (e.g. `0001-sales-sam`) but nothing renders them. Strawberry uses deterministic procedural SVG generation (body/head/eyes/hair/colors from seed). We render an initial letter in a colored square.

### Browser Capabilities
- **Ad blocker** — `@ghostery/adblocker-electron` is in `package.json` but never initialized in `src/main/index.ts`.
- **Chrome extension support** — `electron-chrome-web-store` is installed but not initialized.
- **Tab video previews** — Strawberry has `TabVideoPreviews` for hover preview. We have no tab preview.
- **Download manager** — Strawberry uses `electron-dl`. We have no download handling.
- **WebAuthn / Passkey** — not present.
- **Global keyboard hooks** — Strawberry uses `uiohook-napi`. We have no global shortcuts.

### Skills & Extensibility
- **Skills system** — Strawberry skills are markdown files with optional TypeScript, loaded as context. 31 official skills (memory-best-practices, research, sales, spreadsheets, etc.). We have no skill loading.
- **MCP client/server** — `@modelcontextprotocol/sdk` is installed but not wired. Strawberry has full MCP over SSE, StreamableHTTP, and stdio.
- **Python + Node.js sandbox** — `SandboxPythonRuntimeManager` + `SandboxNpmPrewarmer`. We have no code execution sandbox.

### Companion Features
- **Companion-specific `defaultChatMode`** — field is defined in our profiles (`expert | standard`) but not used in the engine. Strawberry switches prompting strategy based on mode.
- **Multi-session isolation** — Strawberry maintains independent chat histories per companion per session. We reset messages on companion switch but share one session globally.
- **Vision / page screenshot in chat** — `browser:screenshot` IPC exists but the sidebar never sends the screenshot to the AI. Strawberry passes captured frames into the AI context.
- **Proactive companion suggestions** — Strawberry triggers companion suggestions based on current URL/page content. We only respond to explicit user input.

### Infrastructure
- **Authentication** — Strawberry uses WorkOS. We have none.
- **Analytics** — PostHog + Sentry. We have none.
- **Auto-update** — `electron-updater` installed, not initialized.
- **Cross-device sync** — `@reflect/synced-fs` + `OptMemConduitSync`. We are local-only.
- **Dreams (background agents)** — long-running headless agent sessions. Our routines run headlessly but with no UI feedback or long session support.

---

## Priority Gaps

### Critical (breaks core agentic loop)

| Gap | Impact | Effort |
|-----|--------|--------|
| WebContentsView migration | Security, CDP access, proper tab isolation | High |
| Memory context injection at inference | AI has no memory of past interactions | Low |
| sqlite-vec initialization + embedding | Semantic memory is unusable | Medium |

### High (missing key product features)

| Gap | Impact | Effort |
|-----|--------|--------|
| Visual seed avatar renderer | Every companion shows a letter, not a face | Medium |
| Screenshot → vision in chat | Companion can't see what user sees | Low |
| Skills system (markdown loader) | No extensibility, no official best-practice prompts | Medium |
| MCP client wiring | No tool ecosystem beyond built-ins | Medium |
| Ad blocker initialization | Users get ads in every tab | Low |
| Extension support initialization | No user extensions | Low |

### Medium (polish and completeness)

| Gap | Impact | Effort |
|-----|--------|--------|
| Tab preview on hover | UX parity with Arc/Strawberry | Medium |
| Proactive page-aware suggestions | Passive companion vs active assistant | High |
| defaultChatMode enforcement | Sam should behave differently than Ria | Low |
| Auto-update wiring | No update delivery | Low |
| Download manager | Basic browser function missing | Low |

---

## Architecture Comparison

| System | detiq (current) | Strawberry |
|--------|----------------|------------|
| Tab rendering | `<webview>` tag in renderer | `WebContentsView` in main process |
| AI routing | Direct Anthropic/OpenAI SDK | Vercel AI Gateway (`provider/model`) |
| Memory format | Markdown files on disk | Markdown files + sqlite-vec embeddings |
| Memory injection | Not implemented | ~1800-token context injected per call |
| Companion identity | Color + initial letter | Procedural SVG avatar from seed |
| Skills | None | 31 official markdown skills |
| MCP | Installed, not wired | Full SSE/StreamableHTTP/stdio client |
| Code execution | None | Python + Node.js sandbox |
| Auth | None | WorkOS SSO |
| Sync | Local only | Synced FS + OptMem conduit |
| Analytics | None | PostHog + Sentry |
| Extensions | Installed, not wired | electron-chrome-web-store active |
| Ad blocking | Installed, not wired | @ghostery active |
| Routines | node-cron, wired | `@reflect/scheduling` + `@reflect/routines` |
| Storage | better-sqlite3 + raw SQL | Drizzle ORM + sqlite-vec |
