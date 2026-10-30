# Strawberry Browser — Technical Architecture & Stack

## Confirmed Tech Stack

| Layer | Technology | Evidence |
|-------|-----------|---------|
| App framework | **Electron** | Multiple reviews confirm; Electron = Chromium + Node.js bundled |
| Rendering engine | **Chromium** | Listed directly in tech descriptions |
| Runtime | **Node.js** | Ships with Electron |
| AI engine | **Anthropic Claude** | Confirmed: "leverages Anthropic's AI technology" |
| Platform | macOS, Windows | Official |
| Language (likely) | TypeScript / JavaScript | Standard Electron stack |

---

## Architecture Deep Dive

### Electron Process Model

Strawberry uses standard Electron architecture with two process types:

```
┌─────────────────────────────────────────────┐
│              Main Process (Node.js)          │
│  - OS integrations (menus, tray, shortcuts) │
│  - IPC coordination                          │
│  - Companion orchestration engine            │
│  - Credit accounting                         │
│  - Routine scheduler                         │
│  - Local storage management                  │
│  - Native audio recording (meetings)         │
└───────────────┬─────────────────────────────┘
                │ IPC (ipcMain/ipcRenderer)
                │
┌───────────────▼─────────────────────────────┐
│           Renderer Processes (Chromium)      │
│  - Browser UI (tabs, address bar, sidebar)  │
│  - Web content (user's websites)            │
│  - Companion UI overlay                     │
│  - Action approval dialogs                  │
└─────────────────────────────────────────────┘
```

### Companion Execution Engine

How a Companion takes actions on a web page:

```
User instruction (text/voice)
         │
         ▼
┌─────────────────────┐
│  Instruction Parser │  (Claude API call)
│  → Task decomposer  │
│  → Action planner   │
└────────┬────────────┘
         │ Action plan
         ▼
┌─────────────────────┐
│  Browser Controller  │
│  - CDP commands      │  Chrome DevTools Protocol
│  - DOM querying      │  via Electron's webContents
│  - XPath tracking    │
│  - Accessibility tree│
│  - Visual recognition│
└────────┬────────────┘
         │ Observations (page state)
         ▼
┌─────────────────────┐
│  Claude API          │  Anthropic
│  - Next action       │
│  - Decision making   │
│  - Approval prompts  │
└────────┬────────────┘
         │ Next action / complete
         └──────────────────────► Result to user
```

### Web Interaction Approach (Hybrid)

Strawberry uses a hybrid approach for web interaction:

1. **Accessibility tree** — primary method; reliable element identification
2. **XPath tracking** — records exact element paths for replay
3. **Visual recognition** — fallback for elements with poor accessibility
4. **DOM structure extraction** — combines with visual for full context

This is why it can interact with virtually any website — it doesn't rely solely on structured APIs.

---

## AI Integration

### Claude API Usage Pattern

```typescript
// Likely pattern for Companion action loop
async function runCompanionStep(
  instruction: string,
  pageState: PageState,
  previousActions: Action[]
): Promise<NextAction> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",  // or claude-opus-4-8 for complex tasks
    max_tokens: 1024,
    system: COMPANION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildActionPrompt(instruction, pageState, previousActions)
      }
    ],
    tools: BROWSER_TOOLS  // click, type, navigate, extract, etc.
  });
  
  return parseNextAction(response);
}
```

### Tool Use / Function Calling

The Companion likely uses Claude's tool use (function calling) with browser action tools:

```json
{
  "tools": [
    {"name": "click", "description": "Click element by XPath or accessibility role"},
    {"name": "type", "description": "Type text into input field"},
    {"name": "navigate", "description": "Navigate to URL"},
    {"name": "extract", "description": "Extract structured data from page"},
    {"name": "scroll", "description": "Scroll page"},
    {"name": "wait", "description": "Wait for element or condition"},
    {"name": "screenshot", "description": "Capture current page state"},
    {"name": "open_tab", "description": "Open URL in new tab"},
    {"name": "switch_tab", "description": "Switch to tab"},
    {"name": "request_approval", "description": "Ask user to approve an action"}
  ]
}
```

---

## Local Data Storage

Since data is "local-first":

| Data Type | Storage |
|-----------|---------|
| Browsing history | SQLite (local) |
| Credentials / passwords | OS Keychain (macOS) / Windows Credential Manager |
| Companion results | SQLite or JSON (local) |
| Recorded workflows | JSON files (local) |
| Meeting transcripts | Local files |
| Credits balance | Synced with Dendrite's backend |

---

## Network Architecture

```
Strawberry App (Electron)
        │
        ├── User websites (normal HTTPS) ─────────────────► Internet
        │
        ├── Anthropic API ────────────────────────────────► api.anthropic.com
        │   (Companion reasoning — page content sent here)
        │
        └── Dendrite Backend ─────────────────────────────► api.strawberrybrowser.com
            (Authentication, credit balance, Routine config,
             optional sync, team features)
```

**Privacy note:** Page content IS sent to Anthropic's API for Companion reasoning. Only browsing history + credentials stay local.

---

## Meeting Recording

- Uses OS-level audio capture (macOS: Core Audio / ScreenCaptureKit)
- Local speech-to-text (likely Whisper or similar) OR Anthropic API
- No external meeting bot required
- Output stored locally as markdown/text

---

## Routine Scheduler

```
Routine config (JSON stored locally)
        │
        ├── Time triggers → OS-level scheduler / Electron interval
        └── Event triggers → Webhooks or polling (email, CRM events)
                │
                ▼
        Companion execution
                │
                ▼
        Results → local storage + UI notification
```

---

## Extension Compatibility

Since it's Chromium-based:
- Chrome extensions work (Chromium extension API)
- Chrome Web Store extensions installable
- MV3 extensions supported

---

## Build & Distribution

| Aspect | Likely Tool |
|--------|------------|
| Build | `electron-builder` or `electron-forge` |
| Auto-update | `electron-updater` |
| Code signing | Apple Developer ID (macOS), Microsoft EV cert (Windows) |
| Notarization | Apple Notarization (macOS) |
| Distribution | Direct download (email link), not App Store |
| Bundle | ASAR archive inside app package |

---

## Performance Considerations

Reviewers note **more lag and memory use than Chrome/Edge** — expected for Electron:

- Each Electron app ships its own Chromium (~200MB)
- Main process + renderer processes = higher baseline RAM
- Companion execution adds LLM API latency (1–5s per action)
- Multi-tab workflows compound memory usage

**Production optimization needed:** Lazy Companion loading, action batching, local caching of page analysis.
