# 11 — The Agentic Browser Vision: detiq Roadmap

---

## What Makes a Browser "Agentic"

A regular browser is a viewport. You navigate, you read, you act. The browser is passive.

An agentic browser has four properties a regular browser lacks:

1. **Page awareness** — the AI knows what's on the current page without you describing it. It reads the DOM, extracts text, sees screenshots. When you navigate to a Stripe invoice, your Finance companion knows it's a Stripe invoice.

2. **Multi-step task execution** — you say "find the 10 best prospects for us in fintech and add them to our CRM" and the companion executes: searches LinkedIn, reads profiles, scores candidates, opens the CRM, fills forms. You watch; you don't click.

3. **Proactive suggestions** — the companion notices things unprompted. You land on a competitor's pricing page and Marketing Maya surfaces a comparison draft. You open a Gmail thread and Executive Eva highlights the pending action item.

4. **Natural language navigation** — "open the last PR Dev opened on our repo" is a command, not a search query. The companion resolves it.

The gap between a regular browser and an agentic one is not a single feature. It's the accumulation of page context + AI inference + tool execution + memory.

---

## Top 10 Agentic Features — Ranked by User Impact

### 1. Page-Aware Companion (auto-context injection on navigate)
**Impact:** Every other feature builds on this.

When the user navigates to a new URL, capture `capturePageState()` and push it into the companion's context automatically — without the user asking. The companion then knows what site this is, what's on screen, and can offer relevant help unprompted.

**Implementation:**
- Wire `did-navigate` event → IPC → sidebar receives `pageContext` update
- Sidebar pre-loads a "what can I help with here?" prompt using the page title + URL
- Engine includes page state in system message prefix, not just in the first user message
- Throttle to 1 context update per navigation (not per scroll)

**Detiq status:** `capturePageState()` exists; not called on navigation events automatically.

---

### 2. Command Palette (⌘K) with Natural Language
**Impact:** The fastest path from intent to action.

A floating command palette (like Raycast or Linear) that accepts natural language. "Ask Ria to summarize this page", "open gmail", "switch to Dev", "find the pricing page", "run my morning brief". Resolves to navigation, companion switch, or companion task dispatch.

**Implementation:**
- Global `keydown` listener in renderer for `⌘K` (already stubbed in `HomePage.tsx`)
- Render a modal over everything (above sidebar, above tabs)
- Parse intent: if it starts with a known companion name → route to that companion; if it looks like a URL → navigate; else → send to active companion as task
- Add `uiohook-napi` later for system-wide ⌘K (works even when browser is not focused)

**Detiq status:** ⌘K focuses the homepage search bar only. No palette, no companion routing.

---

### 3. Screenshot + Vision (AI sees what you see)
**Impact:** Unlocks all visual tasks — form filling, UI QA, data from charts.

`browser:screenshot` IPC already exists and returns a base64 data URL. The sidebar just needs to attach it to the AI call as an image part.

**Implementation:**
- Add a camera icon button to CompanionSidebar input row
- On click: call `browser:screenshot`, receive data URL, attach as `{ type: 'image', image: dataUrl }` in the Vercel AI SDK message
- In `engine.ts`: accept optional `imageAttachments` param; include in first user message
- Works with Claude (vision) and GPT-4o

**Detiq status:** IPC defined, not connected to sidebar or engine.

---

### 4. Research Mode (multi-tab synthesis)
**Impact:** Replaces 30 minutes of manual research with one command.

"Research the top 5 AI browser startups, including funding, team size, and key differentiators." The companion opens tabs, navigates each, extracts data, closes tabs, and synthesizes a structured report.

**Implementation:**
- Requires multi-tab control: companion can call `browser:newTab`, `browser:navigate` with a tab ID, `browser:closeTab`
- Add tab management IPC: `browser:newTab → tabId`, `browser:closeTab(tabId)`
- Engine's `navigate` tool creates a new tab when the companion needs a parallel page
- Results accumulated in `extract` tool calls; synthesized on `task_complete`
- Surface as a "Research" mode toggle in CompanionWorkspace header

**Detiq status:** Single-tab only. No tab creation from agent.

---

### 5. Proactive Alerts (companion notices something interesting)
**Impact:** Turns the companion from reactive assistant to active team member.

After each navigation, run a lightweight "should I say something?" check: send page URL + title + first 500 chars to the companion with a system prompt asking it to surface anything relevant to its role. If the response is non-empty, show a small toast from the companion.

**Implementation:**
- Background check triggered on `did-navigate`
- Lightweight model call (Haiku / GPT-4o-mini) — not the full agent loop
- Result shown as a companion chip below the address bar: "Maya: This is [Competitor]'s pricing page — want a comparison?"
- User can dismiss or expand into full sidebar chat
- Per-companion tuning: Research Ria fires on news/research sites; Finance Finn fires on invoices/payment pages; Sales Sam fires on LinkedIn profiles

**Detiq status:** Not implemented. Page content never reaches the AI unless user asks.

---

### 6. Smart Form Fill (AI fills forms from companion memory)
**Impact:** Eliminates the most tedious browser task.

User clicks a button in the sidebar ("fill this form"). Companion reads all form fields on the page via `capturePageState().interactiveElements`, matches each to known values in companion memory (name, email, company, address, card info stored in `global.md`), and fills each field via the `type` tool. Shows a diff for review before submitting.

**Implementation:**
- Add a "Fill Form" quick action to sidebar suggestions when page contains `<form>` elements
- Engine prompt: "Here are the form fields: [...]. Here is the user's profile memory: [...]. Fill what you know, leave unknown fields blank."
- Use `request_approval` tool before submit
- Store structured profile data in `global.md` under a `## Profile` heading

**Detiq status:** `type` tool exists; no form-detection or memory-to-field matching.

---

### 7. History Semantic Search
**Impact:** "Find that pricing page I visited last week" actually works.

Browser history is already being stored in `browser_history` SQLite table. Add embeddings: when a page is visited, embed its title + URL + first 500 chars of visible text, store the vector in `companion_memory` with `companion_id = '__history__'`. Query with sqlite-vec.

**Implementation:**
- On `did-stop-loading`: capture page state, embed, upsert into `companion_memory`
- Add `history:search(query)` IPC that runs sqlite-vec semantic search
- Surface in a "History" panel in LeftNav or via ⌘K: "pages about X"
- sqlite-vec is already in `package.json`; needs initialization

**Detiq status:** History table exists; no embeddings, no semantic search.

---

### 8. Task Queue (multi-step task tracker in sidebar)
**Impact:** Makes long-running tasks visible and trustworthy.

When a companion starts a multi-step task, show a structured task card rather than raw action logs. Each tool call becomes a step with status (pending / running / done / failed). User can see the plan and intervene.

**Implementation:**
- Before the agent loop, ask the model to output a plan as structured JSON: `[{ step, description }]`
- Render plan as a checklist in the sidebar; update step status as tool calls resolve
- "Pause" button halts the loop after current step; "Resume" continues
- Persist completed task cards so user can review what was done

**Detiq status:** Action log exists (flat list of strings). No plan structure, no step status.

---

### 9. Site-Specific Companion Suggestions
**Impact:** Right help at the right moment without the user thinking about which companion to ask.

Maintain a mapping of URL patterns → companion IDs. When navigating to `linkedin.com`, nudge toward Sales Sam or Talent Ren. On `github.com`, nudge toward Developer Dev. Show a small "Switch to Dev?" chip in the address bar.

**Implementation:**
- Add `appIds` to companion profile (already present: `['linkedin', 'github', 'sheets']`)
- Map app IDs to URL patterns: `{ linkedin: /linkedin\.com/, github: /github\.com/ }`
- On navigate: find companions whose `appIds` match the current URL
- Show a non-intrusive suggestion chip; clicking switches the active companion

**Detiq status:** `appIds` field exists on profiles; not used for URL matching.

---

### 10. Page Summary on Sidebar Load
**Impact:** Quick value delivery — user opens sidebar and immediately gets useful context.

When the companion sidebar opens (or the companion is switched), automatically run a lightweight summarization of the current page and display it as the companion's first message, replacing the static suggestions.

**Implementation:**
- On sidebar open: call `capturePageState()`, send to model with prompt "Summarize what this page is about in 2 sentences and suggest one action relevant to your role."
- Display as companion's intro message (replaces static `about` text after first page visit)
- Cache per URL so reopening the sidebar doesn't re-run the call

**Detiq status:** Static `about` text shown. No auto-summary.

---

## Competitor Analysis

### Arc Browser
**What they do well:** Space/profile management, command bar (⌘T anywhere), Boost (per-site CSS/JS injection), pinned tabs that persist across sessions, AI features (Ask on Page, Arc Search). Chrome extension compatible.
**Weakness:** AI is bolt-on, not agentic. No companion concept. Closed source. Recently pivoted away from the browser product itself.
**Lesson for detiq:** The sidebar + spaces concept works. Keyboard-first navigation is table stakes.

### Perplexity Browser (for iOS / Comet)
**What they do well:** Native AI answer layer over every page — ask a question, get an answer sourced from the current page. AI bar always accessible. Tight web search integration.
**Weakness:** Read-only AI (no form fill, no multi-step tasks). Single AI identity, not role-specific companions.
**Lesson for detiq:** Page-aware AI that answers immediately is the right default. Role-specific companions differentiate us.

### Opera Aria
**What they do well:** Native AI sidebar (GPT + Aria) built into a mainstream browser. Works on any page. Image generation. Basic browsing assistance.
**Weakness:** Shallow integration — AI is a chat widget, not an agent. No memory, no task execution, no companion roles.
**Lesson for detiq:** Being "native" matters (no extension install). That's our Electron advantage.

### Siri / Apple Intelligence Browser Integration
**What they do well:** OS-level context — Siri knows your calendar, mail, and contacts alongside what's in Safari. On-device processing. Privacy story.
**Weakness:** Bounded by Apple's platform. No custom companions, no user-defined roles, no agentic task execution. Locked to Safari.
**Lesson for detiq:** Cross-app context (browser + calendar + email) is powerful. Our memory system should aspire to this. MCP is the path.

### Strawberry Browser (primary reference)
**What they do well:** The most complete agentic browser we've found. WebContentsView architecture, OptMem semantic memory, 9 built-in companion personas, 40+ native integrations, Python/Node sandbox, skills system, Dreams (background agents), cross-device sync, deterministic SVG avatars, Vercel AI Gateway multi-model routing.
**Weakness:** Closed source, subscription, no extension marketplace parity with Chrome. Avatar system is visual polish over substance.
**Lesson for detiq:** The memory system (OptMem) and skills system are the core moat. Everything else is execution. Prioritize those.

---

## Technical Implementation Notes

| Feature | Key file(s) to create/modify | Hard dependency |
|---------|------------------------------|-----------------|
| Page-aware context | `src/main/ipc/handlers.ts` + `CompanionSidebar.tsx` | — |
| ⌘K command palette | New `CommandPalette.tsx` component | — |
| Screenshot + vision | `CompanionSidebar.tsx` + `engine.ts` | — |
| Research mode (multi-tab) | `browser-control/tab-manager.ts` (new) | WebContentsView migration |
| Proactive alerts | `src/main/companion/page-watcher.ts` (new) | Page-aware context |
| Smart form fill | `engine.ts` prompt update + `global.md` schema | Page-aware context |
| History semantic search | `src/main/storage/history-embed.ts` (new) | sqlite-vec init |
| Task queue UI | `CompanionSidebar.tsx` task card component | — |
| Site-specific suggestions | `src/main/companion/url-matcher.ts` (new) | — |
| Page summary on open | `CompanionSidebar.tsx` useEffect on mount | Page-aware context |

**Recommended build order:** Features 1 (page context) → 3 (vision) → 2 (⌘K) → 5 (proactive) → 10 (auto-summary) → 9 (site suggestions) → 6 (form fill) → 4 (research mode) → 7 (history search) → 8 (task queue).

Features 1, 3, 10, and 9 can all be shipped in the same sprint since they share the same page context infrastructure. Features 4 and 7 both require the WebContentsView migration and sqlite-vec initialization respectively — unblock those first.
