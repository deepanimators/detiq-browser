# Gap Analysis — Current Build vs Strawberry v0.1.77

> Comparing `/Users/deepak/Downloads/Projects/detiq-browser/src/` vs confirmed ASAR findings.

---

## Critical Gaps (breaks core functionality)

### 1. Tab Management — WebContentsView vs webview tag
**Status:** ❌ Missing  
**Current:** Using deprecated `<webview>` HTML tag in renderer  
**Strawberry:** `WebContentsView` in main process (proper Electron 28+ API)  
**Impact:** webview tag has security issues, limited IPC, no proper CDP access  
**Fix:** Replace `WebViewArea.tsx` webview with `WebContentsView` managed in main process

### 2. Tab ↔ WebContents Registration
**Status:** ❌ Missing  
**Current:** `tabWebContentsMap` in actions.ts never gets populated  
**Required:** Main process creates `WebContentsView`, maps tabId → webContentsId, injects into renderer via IPC  
**Fix:** `browser-window.ts` module to manage tab lifecycle

### 3. OpenAI / Multi-Model Support
**Status:** ❌ Missing  
**Current:** Hardcoded `claude-sonnet-4-6` via `@ai-sdk/anthropic`  
**Strawberry:** Vercel AI Gateway with `gpt-5.6-luna` (main) + `anthropic/claude-haiku-5-5` (memory)  
**Fix:** Add `@ai-sdk/openai` + gateway routing, model selector

### 4. File-Based Memory System
**Status:** ❌ Missing  
**Current:** `companion_memory` SQLite table (wrong approach)  
**Strawberry:** Markdown files on disk: `/shared/global.md`, `/shared/best-practices/`, companion-specific dirs  
**Fix:** Implement filesystem-based memory with markdown files + headings

### 5. Companion Persona System
**Status:** ❌ Stub only  
**Current:** Single generic companion, no persona, no avatar  
**Strawberry:** 9 official personas with system prompts, visual seeds, setup skills, linked apps  
**Fix:** `companion-profiles.ts` with full persona definitions

---

## High Priority Gaps (core features missing)

### 6. Skills System
**Status:** ❌ Missing  
**Strawberry has:** Official skills (markdown + optional TS), custom skills, skill catalog  
**Skills catalog includes:** memory-best-practices, routines, skill-authoring, natural-writing, spreadsheets, research, sales, recruiting, etc.  
**Fix:** Skills stored as markdown files, loaded into companion context on demand

### 7. Routine Scheduler (node-cron)
**Status:** ❌ Defined but not wired  
**Current:** `routines/store.ts` has CRUD, no scheduler running  
**Fix:** Initialize `node-cron` in main process on app ready, load enabled routines, schedule them

### 8. Vector Memory (OptMem)
**Status:** ❌ Missing  
**Strawberry has:** sqlite-vec for local vector search, embedding per memory note  
**Fix:** Embed memory notes with `text-embedding-3-small` (via AI SDK), store in sqlite-vec

### 9. IPC for Navigation Events
**Status:** ❌ Missing  
**Current:** `browser:navigate` IPC handler not implemented in handlers.ts  
**Fix:** Add navigation/back/forward/refresh IPC handlers tied to WebContentsView

### 10. Companion Avatar System
**Status:** ❌ Missing  
**Strawberry has:** Procedural SVG avatars from visual seed (body/head/eyes/hair/colors)  
**Fix:** SVG avatar generator from seed string

---

## Medium Priority Gaps

### 11. Authentication (WorkOS)
**Status:** ❌ Missing  
**Strawberry uses:** WorkOS for SSO + device management  
**Our option:** Clerk (simpler) or WorkOS  
**Fix:** Phase 3 — gate companion API behind auth

### 12. MCP Client Integration
**Status:** ❌ Missing (package installed, not wired)  
**Strawberry:** Full MCP client (SSE, StreamableHTTP, stdio)  
**Fix:** MCP manager that connects to user-configured MCP servers

### 13. Meeting Recorder
**Status:** ❌ Missing  
**Strawberry:** OS-level audio capture, no-bot transcription  
**Fix:** Phase 2 — use `node-record-lpcm16` + Whisper API

### 14. Credit System
**Status:** ❌ Missing  
**Strawberry:** Token counting per action (tiktoken), deduction API  
**Fix:** Count tokens per Claude/OpenAI call, track in SQLite

### 15. Dreams (Background Sessions)
**Status:** ❌ Missing  
**Strawberry:** Long-running background agent sessions  
**Fix:** Background worker thread running companion loop without UI

### 16. Conduits (Cross-Device)
**Status:** ❌ Missing  
**Fix:** Phase 3+

### 17. Integration System
**Status:** ❌ Missing  
**Strawberry has:** 40+ typed integration modules  
**Fix:** Start with 5: Gmail, Slack, GitHub, Notion, Google Sheets

### 18. Extension Support
**Status:** ❌ Not wired (package installed)  
**Fix:** Initialize `electron-chrome-web-store` in main process

### 19. Ad Blocking
**Status:** ❌ Not wired (package installed)  
**Fix:** Initialize `@ghostery/adblocker-electron` in main process

### 20. Auto-Update
**Status:** ❌ Not wired (package installed)  
**Fix:** Add `autoUpdater` init in main process

---

## Low Priority Gaps (polish)

| Gap | Priority |
|-----|----------|
| Browser history UI | Low |
| Bookmarks | Low |
| Password/data import | Low |
| Global keyboard shortcuts | Low |
| Native haptics (Mac) | Low |
| Dock icon management | Low |
| Window peek | Low |
| Tab video previews | Low |
| PDF viewer | Low |
| Spreadsheet support | Low |

---

## Fix Priority Order

```
Week 1: #1 WebContentsView + #2 Tab registration + #9 Navigation IPC
Week 2: #3 OpenAI multi-model + #4 File memory + #5 Companion personas
Week 3: #6 Skills + #7 Routine scheduler + #10 Avatar system
Week 4: #8 Vector memory + #11 Auth + #12 MCP client
Week 5+: #13-20 Polish features
```
