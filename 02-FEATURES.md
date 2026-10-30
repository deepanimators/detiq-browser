# Strawberry Browser — Complete Feature List (v0.1.77 verified from ASAR)

> All features verified from ASAR extraction of actual app binary.

---

## 1. AI Companions (Core Feature)

9 official companion personas built into the app, each with personality, avatar, system prompt, linked integrations, and setup skills.

### Official Companions
| Companion | Role | Default Apps |
|-----------|------|-------------|
| Consulting Cora | Client acquisition, proposals, progress reports | Gmail, Google Docs, Calendar, LinkedIn |
| Developer Dana | QA, bug reports, product feedback | GitHub, Linear, Notion |
| Executive Ellis | Chief of staff, inbox management, daily brief | Gmail, Calendar, Slack |
| Marketing Martin | Content, campaigns, brand voice | Slack, Google Docs, Sheets |
| Operations Olivia | Admin, weekly updates, recurring tasks | Slack, Notion, Sheets |
| Research Rosa | Sourced research, market maps, data extraction | Google Sheets |
| Sales Sally | Lead finding, outreach, CRM updates | Gmail, LinkedIn, Sheets |
| Support Sofia | Support inbox, doc-based replies, bug routing | Gmail, Slack, Linear |
| Talent Theo | Candidate sourcing, scorecards, pipeline | LinkedIn, GitHub, Ashby |

### How Companions Work
- Natural language instruction → AI breaks into browser actions
- Operates inside your authenticated sessions (no re-login)
- Visual step-by-step execution you can watch, pause, replay
- Approval gate before irreversible actions (sends, submits, deletes)
- Each companion has custom instructions, skills, and memory
- Companions evolve: learn user preferences, can be renamed/re-styled

### Companion Profile System
- Custom avatar appearance (body, head, eyes, hair, accessories, colors)
- Default chat mode: `expert` or `standard`
- Template skills + custom skills per companion
- Persistent memory per companion
- Shareable companion profiles (contentHash for identity)

---

## 2. Skills System

Skills are markdown files with instructions + optional TypeScript code, executed inside the companion's context.

### Skill Types
- **Official skills** — built by Strawberry team (`strawberry/sales/getting-started-with-sales-in-strawberry`)
- **Custom skills** — user-created, stored in companion profile directory

### Integration Skills (code-based)
- Each integration has a TypeScript `index.ts` with exported `tools` array
- Strawberry bundles integration code before sandbox execution
- Integrations discoverable by Companions automatically
- Skills are the unit of automation capability

---

## 3. Sandbox Execution (Python + TypeScript/Node.js)

Companions can write and execute code in isolated sandboxes.

### Python Sandbox
- `SandboxPythonRuntimeManager` — managed Python runtime
- `SandboxNpmPrewarmer` — pre-warms npm packages
- Full Python data processing capability inside the browser

### TypeScript/Node.js Sandbox
- `ChatScriptRunner` — runs scripts in chat context
- `DevSandboxCodeRunner` — dev mode execution
- TypeScript compiler (`typescript` chunk) bundled in app
- `esbuild-wasm` for client-side bundling

### Security
- `NativeSandboxTransport` — native IPC to isolated process
- `sandbox-helper-process` — child process isolation
- `node:vm` for additional JavaScript isolation
- Resource policies per sandbox

---

## 4. Routines (Automation Scheduling)

### Trigger Types
- **Schedule** — cron-based (every hour, daily at 9am, weekdays)
- **Event** — new email, new CRM record, webhook
- **Manual** — button-triggered

### Routine Features
- Event-triggered: new email → companion researches sender → drafts reply for approval
- Scheduled: daily at 9am → extract competitor pricing → update spreadsheet
- Routine suggestions AI-generated (`routine-suggestion-store`)
- Results always returned for review before committing

---

## 5. OptMem (Optimal Memory System)

Vector-based persistent memory for companions.

### Components
- `OptMemContext` — builds context from memories for AI calls
- `OptMemQueryService` — semantic query over memories
- `OptMemNoteVectorsClient` — stores/retrieves embeddings
- `sqlite-vec` — local vector search (no external DB needed)
- `OptMemConduitSync` — sync memories across devices
- `recall-prefetch` — preloads relevant memories before companion runs

### Memory Types
- Note memories (text + embedding)
- Activity memories (`@reflect/activity-memory`)
- Chat transcript memories

---

## 6. 40+ Native Integrations

Each integration has a TypeScript module with typed tool definitions that Companions use natively.

### Categories
**Productivity:** Airtable, Asana, ClickUp, Confluence, Jira, Linear, Microsoft Lists, Miro, Notion, Trello, Wrike  
**CRM & Sales:** Apollo, Ashby, Front, Lusha, Salesforce  
**Communication:** Gmail, Outlook, Slack, Telegram, WhatsApp (via Baileys), Zoom, Twilio  
**Storage:** Box, Dropbox, Google Drive, OneDrive, SharePoint  
**Google Workspace:** Google Docs, Sheets  
**Marketing:** Brevo, Mailchimp, Meta Ads, SurveyMonkey, Typeform, Webflow  
**Developer:** GitHub, GitLab, Cloudflare, Vercel, Figma, Resend  
**Finance:** Harvest, Shopify, Xero  
**Calendar:** Cal.com, Calendly, Native Calendar (macOS), Outlook Calendar  
**Messaging:** WhatsApp, Telegram, Zoom  

---

## 7. Conduits (Cross-Device)

Conduits allow Strawberry to connect to and observe other devices.

- `ConduitDeviceRegistry` — registered devices
- `ConduitSnoopService` — observe data from conduit
- `conduitDeviceIdentity` — unique device identity
- `OptMemConduitSync` — sync memory across devices via conduit

Use cases: phone automation, cross-device workflows.

---

## 8. Dreams (Background Agent Sessions)

"Dreams" appears to be long-running background agent sessions.

- `dream-sessions` — session lifecycle management
- `dream-client` — client interface
- `list-dreams` — enumerate dream sessions
- `start-dreams` — initiate a background session

Think: agents that run while you sleep, completing multi-hour tasks.

---

## 9. Meeting Recorder (No Bot)

- Records Zoom, Google Meet, Microsoft Teams locally
- No bot joins the call
- Uses OS audio capture (ScreenCaptureKit on macOS, WASAPI on Windows)
- WAV audio processing (`wav` chunk, `@breezystack/lamejs` for MP3)
- Output: transcript + summary + action items + follow-ups
- `DisplayMediaHandler` — screen/audio capture
- `connectMeetingUrlDetection` — auto-detect when in a meeting

---

## 10. Browser Features

Full Chromium browser + extras:

- Chrome Web Store extension support (`electron-chrome-web-store`)
- Ad blocking built-in (`@ghostery/adblocker-electron`)
- Tab video previews (`TabVideoPreviews`)
- Window peek / hover preview (`WindowPeek`)
- Download manager (`electron-dl`)
- WebAuthn / Passkeys (`electron-webauthn`, `passkey`)
- Native haptics on Mac (`native-haptics`)
- Global keyboard shortcuts (`uiohook-napi`)
- Firefox password import
- Safari data import
- Apple Keychain import
- macOS dock icon management

---

## 11. Password & Data Import

- Import from Chrome/Safari
- Import Apple Keychain passwords
- Import Firefox passwords
- Browser bookmark import (`browserImport`)

---

## 12. File & Document Processing

- PDF reading and extraction (`pdfjs-dist`)
- Excel/XLSX via SheetJS
- CSV parsing
- Image processing: HEIC, EXIF (`@napi-rs/image`, `heic-decode`, `exifr`)
- Audio: WAV + MP3 encoding
- ZIP/TAR extraction
- YAML, XML, Markdown parsing

---

## 13. Credit System

- Credits consumed only for AI actions
- Regular browsing free
- Credit cost tracked per operation (tiktoken for token counting)
- `usageCostReport` — detailed usage breakdown
- `MaintenanceCreditOfferManager` — credit offers/promotions
- `billingPolicy` module — plan enforcement

### Plans
| Plan | Price | Credits/month |
|------|-------|--------------|
| Free | $0 | 500 |
| Intern | $20 | 6,000 |
| Part-time | $85 | 25,000 |
| Full-time | $250 | 75,000 |
| Top-up | $10 | 1,000 |

---

## 14. Team Features

- `@reflect/teams` package — full team support
- `team_creator` chunk — team creation flow
- `teams` chunk — team management
- Shared companions, routines, skills across team
- Team member permissions

---

## 15. AI Models

Strawberry uses **Vercel AI SDK 7** with **Vercel AI Gateway**:

| Model | Used for |
|-------|---------|
| `anthropic/claude-haiku-5-5` | OptMem (memory operations) |
| `gpt-5.6-luna` | Main companion chat and actions |

Multi-model support via Vercel AI Gateway provider string format.

---

## 16. MCP Integration

Full MCP (Model Context Protocol) built in:

- `@modelcontextprotocol/sdk` client + server
- MCP client: SSE, StreamableHTTP, stdio transports
- Companions can connect to external MCP servers
- Strawberry itself can act as MCP server

---

## 17. Telemetry & Observability

- PostHog analytics
- Sentry error tracking (`@sentry/electron` + `@sentry/node-native`)
- `MainThreadStallMonitor` — UI freeze detection
- `BenchmarkManager` — performance benchmarking
- `PerformanceScenarioRunner` — automated performance tests
- `usageCostReport` — credit/token usage reports
