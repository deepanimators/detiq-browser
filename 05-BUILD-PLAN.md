# Build Plan — Production-Ready AI Browser (Strawberry Clone)

## Project Name: detiq-browser

---

## Strategic Choices

Before coding, these decisions shape everything:

| Decision | Choice | Reason |
|----------|--------|--------|
| App framework | **Electron** | Same as Strawberry; Chromium embedded; fastest path; huge ecosystem |
| AI provider | **Anthropic Claude** | Same as Strawberry; best tool use; claude-sonnet-4-6 for speed |
| Language | **TypeScript** | Type safety across main + renderer; essential for complex agent logic |
| UI framework | **React + Tailwind** | Renderer process UI; component reuse |
| Build tool | **electron-forge** | Official Electron build tooling |
| Local DB | **SQLite (via better-sqlite3)** | Sync, fast, local-first |
| State management | **Zustand** | Lightweight, works well in Electron renderer |

---

## System Architecture

```
detiq-browser/
├── src/
│   ├── main/                    # Electron main process (Node.js)
│   │   ├── index.ts             # App entry, window management
│   │   ├── browser-window.ts    # BrowserWindow creation, tab management
│   │   ├── companion/           # Companion engine
│   │   │   ├── engine.ts        # Orchestration loop
│   │   │   ├── claude-client.ts # Anthropic API integration
│   │   │   ├── tools.ts         # Browser action tool definitions
│   │   │   └── approvals.ts     # Permission gate
│   │   ├── browser-control/     # CDP / webContents control
│   │   │   ├── page-state.ts    # Extract DOM, a11y tree, screenshot
│   │   │   ├── actions.ts       # Execute: click, type, navigate, etc.
│   │   │   └── xpath.ts         # Element tracking for replay
│   │   ├── routines/            # Scheduler
│   │   │   ├── scheduler.ts     # Cron + event triggers
│   │   │   └── runner.ts        # Run routine → Companion
│   │   ├── recorder/            # Meeting recorder
│   │   │   ├── audio.ts         # OS audio capture
│   │   │   └── transcribe.ts    # Whisper / Claude transcription
│   │   ├── storage/             # Local data
│   │   │   ├── db.ts            # SQLite setup
│   │   │   ├── history.ts       # Browsing history
│   │   │   └── results.ts       # Companion output storage
│   │   ├── credits/             # Credit tracking
│   │   │   ├── counter.ts       # Local credit tracking
│   │   │   └── sync.ts          # Sync with backend
│   │   └── ipc/                 # IPC handlers
│   │       └── handlers.ts
│   │
│   ├── renderer/                # Electron renderer process (React)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── browser/         # Tab bar, address bar, webview
│   │   │   ├── companion/       # Companion sidebar, chat UI
│   │   │   ├── routines/        # Routine builder UI
│   │   │   ├── approvals/       # Action approval dialogs
│   │   │   └── settings/        # Settings panels
│   │   ├── stores/              # Zustand state
│   │   └── hooks/
│   │
│   └── preload/                 # Preload scripts (context bridge)
│       └── index.ts
│
├── backend/                     # Optional: lightweight backend
│   ├── auth.ts                  # User auth, JWT
│   ├── credits.ts               # Credit management
│   └── routines-sync.ts         # Cross-device routine sync
│
├── package.json
├── electron.vite.config.ts      # electron-vite build config
└── forge.config.ts              # electron-forge packaging
```

---

## Phase 1: Foundation (Week 1–2)

### Goals
- Working Electron browser shell
- Tab management
- Basic UI chrome

### Tasks

**1.1 Electron shell**
```bash
npm create @electron/app@latest detiq-browser -- --template=vite-ts
```

**1.2 Tab management**
- Implement `BrowserView`/`WebContentsView` per tab (not `<webview>` — deprecated)
- Tab bar: open, close, switch, pin
- Address bar: URL display, navigation

**1.3 Basic UI chrome**
```
┌─────────────────────────────────────────────────────┐
│  [←] [→] [↻]  [🔒 strawberrybrowser.com]  [⬡ ...]  │ ← Top bar
├─────────────────────────────────────────────────────┤
│ Tab 1 | Tab 2 | Tab 3 | [+]                         │ ← Tab bar
├──────────────────────────────────┬──────────────────┤
│                                  │                  │
│         Web Content              │  Companion       │ ← Sidebar
│         (WebContentsView)        │  Sidebar         │
│                                  │                  │
└──────────────────────────────────┴──────────────────┘
```

**1.4 Security setup**
- Context isolation: ON
- Node integration in renderer: OFF
- Content Security Policy headers
- Preload scripts for safe IPC bridge

**Verify:** Browser opens, loads URLs, tabs work, back/forward/refresh work.

---

## Phase 2: Page State Extraction (Week 3)

### Goals
- Extract DOM structure from any page
- Extract accessibility tree
- Capture screenshots
- Track elements by XPath

### Key Code: Page State Extractor

```typescript
// src/main/browser-control/page-state.ts
export interface PageState {
  url: string;
  title: string;
  screenshot: string;        // base64 PNG
  accessibilityTree: A11yNode[];
  interactiveElements: Element[];
  visibleText: string;
}

export async function capturePageState(
  webContents: Electron.WebContents
): Promise<PageState> {
  // 1. Screenshot
  const screenshot = await webContents.capturePage();
  
  // 2. Accessibility tree via CDP
  const { nodes } = await webContents.debugger.sendCommand(
    'Accessibility.getFullAXTree'
  );
  
  // 3. Interactive elements
  const elements = await webContents.executeJavaScript(`
    Array.from(document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [onclick]'
    )).map(el => ({
      tag: el.tagName,
      text: el.innerText?.slice(0, 100),
      xpath: getXPath(el),
      rect: el.getBoundingClientRect()
    }))
  `);
  
  return { url, title, screenshot, accessibilityTree: nodes, interactiveElements: elements };
}
```

**Verify:** Can extract structured data from any website.

---

## Phase 3: Companion Engine (Week 4–5)

### Goals
- Claude tool use integration
- Browser action execution
- Approval gate for risky actions

### Claude Tool Definitions

```typescript
// src/main/companion/tools.ts
export const BROWSER_TOOLS = [
  {
    name: "navigate",
    description: "Navigate to a URL",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"]
    }
  },
  {
    name: "click",
    description: "Click an element",
    input_schema: {
      type: "object",
      properties: {
        xpath: { type: "string" },
        description: { type: "string" }  // human-readable
      },
      required: ["xpath", "description"]
    }
  },
  {
    name: "type",
    description: "Type text into focused input",
    input_schema: {
      type: "object",
      properties: {
        xpath: { type: "string" },
        text: { type: "string" }
      },
      required: ["xpath", "text"]
    }
  },
  {
    name: "extract",
    description: "Extract structured data from current page",
    input_schema: {
      type: "object",
      properties: {
        schema: { type: "object" },  // JSON schema for output
        instructions: { type: "string" }
      },
      required: ["schema"]
    }
  },
  {
    name: "request_approval",
    description: "Ask user to approve before a risky action",
    input_schema: {
      type: "object",
      properties: {
        action_description: { type: "string" },
        consequences: { type: "string" }
      },
      required: ["action_description", "consequences"]
    }
  },
  {
    name: "open_tab",
    description: "Open a URL in a new tab",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"]
    }
  },
  {
    name: "task_complete",
    description: "Signal task is complete",
    input_schema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"]
    }
  }
];
```

### Companion Loop

```typescript
// src/main/companion/engine.ts
export async function runCompanion(
  instruction: string,
  activeTab: Tab,
  onAction: (action: Action) => void
): Promise<CompanionResult> {
  const messages: MessageParam[] = [
    { role: "user", content: instruction }
  ];
  
  const MAX_STEPS = 50;
  
  for (let step = 0; step < MAX_STEPS; step++) {
    const pageState = await capturePageState(activeTab.webContents);
    
    // Add page state as context
    messages.push({
      role: "user",
      content: buildPageStateContext(pageState)
    });
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: COMPANION_SYSTEM_PROMPT,
      messages,
      tools: BROWSER_TOOLS,
      tool_choice: { type: "auto" }
    });
    
    messages.push({ role: "assistant", content: response.content });
    
    // Handle tool calls
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      
      // Approval gate for risky actions
      if (block.name === "request_approval") {
        const approved = await showApprovalDialog(block.input);
        if (!approved) return { status: "cancelled" };
      }
      
      const result = await executeAction(block, activeTab);
      onAction({ tool: block.name, input: block.input, result });
      
      if (block.name === "task_complete") {
        return { status: "success", summary: block.input.summary };
      }
      
      // Feed tool result back
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) }]
      });
    }
  }
  
  return { status: "max_steps_reached" };
}
```

**Verify:** Companion can navigate to a URL, click a button, extract text, and return a result.

---

## Phase 4: Routines & Scheduling (Week 6)

### Goals
- Create, save, run Routines
- Time-based triggers
- Event-based triggers (email, webhook)

### Routine Schema

```typescript
interface Routine {
  id: string;
  name: string;
  instruction: string;
  trigger: TimeTrigger | WebhookTrigger;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

interface TimeTrigger {
  type: "schedule";
  cron: string;  // "0 9 * * 1-5" = weekdays at 9am
}

interface WebhookTrigger {
  type: "webhook";
  url: string;   // local webhook endpoint
}
```

### Scheduler

```typescript
// Use node-cron for time-based triggers
import cron from 'node-cron';

export function scheduleRoutine(routine: Routine) {
  if (routine.trigger.type === "schedule") {
    cron.schedule(routine.trigger.cron, async () => {
      await runCompanion(routine.instruction, getActiveTab());
    });
  }
}
```

**Verify:** Routine runs automatically at scheduled time.

---

## Phase 5: Meeting Recorder (Week 7)

### Goals
- Capture system audio (Zoom, Meet, Teams calls)
- Transcribe locally
- Generate notes + action items

### Implementation

```typescript
// macOS: Use ScreenCaptureKit via native module or ffmpeg
// Windows: WASAPI loopback capture

// Transcription options:
// Option A: Local Whisper (whisper.cpp via Node binding) — fully private
// Option B: Claude API with audio file upload — simpler

async function transcribeRecording(audioPath: string): Promise<Transcript> {
  const audioData = fs.readFileSync(audioPath);
  
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "audio/mp4", data: audioData.toString('base64') }
        },
        { type: "text", text: "Transcribe this meeting. Extract: full transcript, 5-bullet summary, action items, follow-up tasks." }
      ]
    }]
  });
  
  return parseTranscript(response);
}
```

---

## Phase 6: Credit System + Backend (Week 8)

### Credit Tracking

```typescript
// Local credit counter — deduct per Claude API call
const CREDIT_COSTS = {
  companion_message: 5,
  companion_action: 10,
  extraction: 20,
  routine_run: 50,
};

// Backend sync: simple REST API
// POST /api/credits/deduct { userId, amount, operation }
// GET /api/credits/balance { userId }
```

### Backend (Minimal)

```typescript
// Hono + Vercel Functions
// - Auth: Clerk or custom JWT
// - Credits: Postgres (via Neon)
// - Routines sync: optional, for cross-device
```

---

## Phase 7: Polish & Production (Week 9–10)

### Performance
- Lazy-load Companion engine (don't init until first use)
- Cache page state for 500ms (avoid redundant CDP calls)
- Batch Claude tool calls when possible

### Distribution
```bash
# Sign + package
electron-forge make
# → dist/
#   Strawberry-1.0.0.dmg        (macOS)
#   Strawberry-1.0.0-Setup.exe  (Windows)
```

### Auto-update
```typescript
import { autoUpdater } from 'electron-updater';
autoUpdater.checkForUpdatesAndNotify();
```

### Security checklist
- [ ] Context isolation enabled
- [ ] Node integration disabled in renderer
- [ ] CSP headers on all local pages
- [ ] No `eval()` in renderer
- [ ] Credentials stored in OS keychain (not sqlite)
- [ ] All IPC inputs validated
- [ ] Anthropic API key in main process only (never renderer)

---

## Full Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| 1: Browser shell | 2 weeks | Working tabbed browser |
| 2: Page state | 1 week | DOM/a11y extraction working |
| 3: Companion engine | 2 weeks | AI agent executes tasks |
| 4: Routines | 1 week | Scheduled automation |
| 5: Meeting recorder | 1 week | Local transcription |
| 6: Credits + backend | 1 week | Auth + billing |
| 7: Polish | 2 weeks | Production-ready |
| **Total** | **~10 weeks** | **Shippable v1.0** |

---

## Tech Stack Summary

```
Frontend:    React 19 + Tailwind CSS + shadcn/ui
State:       Zustand
App shell:   Electron 36 (Chromium 130+, Node 24)
Build:       electron-vite + electron-forge
AI:          Anthropic Claude (claude-sonnet-4-6 for agents, claude-opus-4-8 for complex)
Local DB:    SQLite via better-sqlite3
Scheduling:  node-cron
Audio:       ffmpeg (cross-platform) or native APIs
Backend:     Hono on Vercel Functions
Auth:        Clerk
DB backend:  Neon (Postgres)
Updates:     electron-updater
Signing:     Apple Developer ID + Microsoft EV cert
```

---

## Key Open Questions

1. **Chromium extension support** — support Chrome extension store out of the box (easy, it's Chromium)
2. **Mobile** — Strawberry doesn't have mobile; skip v1
3. **Team features** — Shared Routines across users; needs backend (Neon + sync API)
4. **AI provider** — Anthropic only, or support multiple? Start with Anthropic, abstract later
5. **On-device LLM** — for privacy-sensitive users; future consideration (llama.cpp)
