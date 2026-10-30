# Strawberry Browser — Reverse Engineering Findings (ASAR v0.1.77)

> Source: `/Volumes/Strawberry 0.1.77-universal/Strawberry.app/Contents/Resources/app.asar`  
> Extracted: `/tmp/strawberry-asar/`  
> Method: `@electron/asar extract` + code analysis

---

## Confirmed Tech Stack (from package.json)

| Component | Technology | Version |
|-----------|-----------|---------|
| App framework | Electron | latest |
| AI SDK | **Vercel AI SDK** | `7.0.83` |
| AI Gateway | **Vercel AI Gateway** | (via `ai` package) |
| ORM | **Drizzle ORM** | `1.0.0-rc.4` |
| Local DB | **better-sqlite3** | `13.0.3` |
| Vector search | **sqlite-vec** | `0.1.9` |
| Schema validation | **Valibot** | `^1.4.2` |
| MCP | **@modelcontextprotocol/sdk** | `^1.31.0` |
| Auth | **WorkOS** (via `@reflect/auth/workos-session`) | - |
| Ad blocking | **@ghostery/adblocker-electron** | `^2.17.3` |
| Chrome extensions | **electron-chrome-web-store** | custom fork |
| Error tracking | **@sentry/electron** | `7.14.0` |
| Analytics | **PostHog** | present |
| Monorepo build | **Nx** | - |
| Image processing | **@napi-rs/image** | `^1.14.0` |
| Worker threads | **Piscina** | `^5.3.2` |
| Token counting | **Tiktoken** | `^1.0.22` |
| Auto-update | **electron-updater** | `^6.8.9` |
| PDF | **pdfjs-dist** | `6.2.108` |
| Spreadsheets | **SheetJS** (`xlsx`) | `0.20.3` |
| Embeddings runner | `sqlite-vec` + custom embedding | - |
| Global shortcuts | **uiohook-napi** | `^1.5.5` |
| macOS scripting | **run-jxa** (JXA) | `^3.0.0` |

---

## AI Models Used (via Vercel AI Gateway)

Format: `provider/model` (Vercel AI Gateway convention)

| Model | Where used |
|-------|-----------|
| `anthropic/claude-haiku-5-5` | OptMem (memory operations) |
| `gpt-5.6-luna` | Multiple roles (chat, actions, preview) |

**NOT direct Anthropic API** — uses Vercel AI SDK 7 with AI Gateway.  
Model IDs confirm Vercel AI Gateway routing (`provider/model` format).

---

## Internal Monorepo Packages (`@reflect/*`)

All internal packages are bundled from `workspace:*` references:

| Package | Purpose |
|---------|---------|
| `@reflect/companions` | Companion system core |
| `@reflect/chat-loop` | The agentic conversation loop |
| `@reflect/chat-session` | Session lifecycle |
| `@reflect/chat-protocol` | Chat messaging protocol |
| `@reflect/chat-transcript` | Transcript storage |
| `@reflect/chat-memory` | Short-term chat memory |
| `@reflect/chat-media` | Media in chat (images, attachments) |
| `@reflect/chat-media-processing` | Process media for AI |
| `@reflect/chat-context` | Context assembly for AI calls |
| `@reflect/conduits` | Cross-device connections |
| `@reflect/skills` | Skill system |
| `@reflect/skill-contracts` | Skill type contracts |
| `@reflect/scheduling` | Routine scheduler |
| `@reflect/routines` | Routine execution |
| `@reflect/models` | AI model abstractions |
| `@reflect/browser-workspace` | Browser/tab workspace |
| `@reflect/address-bar` | Address bar component |
| `@reflect/synced-fs` | Synced filesystem |
| `@reflect/synced-fs-contracts` | Synced FS types |
| `@reflect/auth` | Authentication (WorkOS) |
| `@reflect/billing` | Billing logic |
| `@reflect/billing-contracts` | Billing type contracts |
| `@reflect/billing-policy` | Credit/plan policy |
| `@reflect/teams` | Team features |
| `@reflect/telemetry` | Analytics/telemetry |
| `@reflect/activity-memory` | Activity-based memory |
| `@reflect/attachments` | File attachments |
| `@reflect/analytics-contracts` | Analytics types |
| `@reflect/content-contracts` | Content types |
| `@reflect/integration-contracts` | Integration types |
| `@reflect/tool-contracts` | Tool type contracts |
| `@reflect/privacy` | Privacy controls |
| `@reflect/security` | Security utilities |
| `@reflect/feature-flags` | Feature flag system |
| `@reflect/feedback-contracts` | User feedback types |
| `@reflect/notifications` | Notification system |
| `@reflect/legal` | Legal/ToS |
| `@reflect/sandbox-contracts` | Sandbox types |
| `@reflect/optmem` | Optimal Memory system |
| `@reflect/excelize-wasm` | Excel/WASM processing |
| `@reflect/eval-app-runtime` | App evaluation runtime |
| `@reflect/companion-profile` | Companion visual profiles |
| `@reflect/chatgpt-plan` | ChatGPT plan integration |
| `@reflect/async` | Async utilities |
| `@reflect/cache` | Caching layer |
| `@reflect/html-formatting` | HTML formatting |
| `@reflect/file-types` | File type detection |

---

## Official Companion Personas (9 Built-in)

Each companion has: persona, system prompt, setup skill, featured skills, avatar appearance (body/head/eyes/hair/accessories/colors), and linked integrations.

| ID | Name | Role | Linked Apps |
|----|------|------|------------|
| `consulting-cora` | Consulting Cora | Client acquisition, proposals, progress reports | Gmail, Google Docs, Google Calendar, LinkedIn |
| `developer-dana` | Developer Dana | QA, bug reports, product insight from feedback | GitHub, Linear, Notion |
| `executive-ellis` | Executive Ellis | Chief of staff, inbox, daily brief, task management | Gmail, Calendar, Slack |
| `marketing-martin` | Marketing Martin | Content, campaigns, brand voice | Slack, Google Docs, Google Sheets |
| `operations-olivia` | Operations Olivia | Admin, weekly updates, recurring tasks | Slack, Notion, Google Sheets |
| `research-rosa` | Research Rosa | Sourced research, market maps, web data → sheets | Google Sheets, - |
| `sales-sally` | Sales Sally | Lead finding, outreach, CRM updates | Gmail, LinkedIn, Google Sheets |
| `support-sofia` | Support Sofia | Support inbox, doc-based replies, bug routing | Gmail, Slack, Linear |
| `talent-theo` | Talent Theo | Candidate sourcing, scorecards, pipeline | LinkedIn, GitHub, Ashby |

### Companion Profile Structure
```typescript
{
  id: string,
  contentHash: string,
  profile: {
    summary: string,
    templateSkills: Skill[],
    customSkills: CustomSkill[],
    about: string,           // intro shown in UI
    templateInstructions: string,  // system prompt
    posts: Post[],           // sample tweets/posts
    appIds: string[],        // integrated apps
    featuredSkills: FeaturedSkill[],
    selectedPaths: [],
    featuredPaths: [],
    customSkillIds: []
  },
  runtime: {
    name: string,
    visualsSeed: string,
    description: string,
    appearance: {
      schemaVersion: 1,
      body: { type, size },
      head: { type, size },
      eyes: { type, size, x, z },
      mouth: { type, size, z },
      pupil: { type, size, x, z },
      hat, eyebrow, hair, eyeAccessory, earAccessory,
      color: { body, head, accent, accessory, ear, hair }
    },
    defaultChatMode: "expert" | "standard"
  }
}
```

---

## 40+ Native Integrations (confirmed from chunk names)

### Productivity
- Airtable
- Asana
- ClickUp
- Confluence
- Jira
- Linear
- Microsoft Lists
- Miro
- Notion
- Trello
- Wrike

### CRM & Sales
- Apollo (sales intelligence)
- Ashby (ATS)
- Front (customer service)
- HubSpot
- Hunter (email finder)
- Lusha (contact data)
- Salesforce

### Communication
- Gmail
- Outlook + Outlook Calendar
- Slack
- Telegram
- WhatsApp
- Zoom
- Twilio

### Storage & Files
- Box
- Dropbox
- Google Drive
- OneDrive
- SharePoint

### Google Workspace
- Google Docs
- Google Sheets

### Marketing
- Brevo (email marketing)
- Mailchimp
- Meta Ads
- SurveyMonkey
- Typeform
- Webflow

### Developer Tools
- GitHub
- GitLab
- Cloudflare
- Vercel (!)
- Figma
- Resend

### Finance
- Harvest (time tracking)
- Shopify
- Xero

### Calendar & Scheduling
- Cal.com
- Calendly
- Native Calendar (macOS)
- Google Calendar (via Gmail)

### Messaging Special
- `@dendrite-systems/baileys` = custom Baileys fork → WhatsApp Web protocol

---

## Key Architecture Components (from chunk names)

### Sandbox System
- `SandboxPythonRuntimeManager` — **Python execution sandbox**
- `SandboxNpmPrewarmer` — **npm package sandbox** (pre-warms Node.js modules)
- `SandboxToolingManager` — manages sandbox tooling
- `NativeSandboxTransport` — native IPC to sandbox process
- `DevSandboxCodeRunner` — dev mode code runner
- `installSandboxTool` — installs tools into sandbox
- `sandbox-helper-process` — sandboxed child process

**Sandboxes can run arbitrary Python and TypeScript/JavaScript code safely!**

### Memory System (OptMem)
- `OptMemContext` — context assembly
- `OptMemQueryService` — semantic query
- `OptMemNoteVectorsClient` — vector embedding client
- `OptMemConduitSync` — syncs memory across devices
- `OptMemReplicaRegistry` — replica management
- `OptMemSyncClient/Runner` — sync to backend
- `sqlite-vec` — local vector search
- `embedding` chunk — embedding generation
- `query-vectors` — vector query logic
- `recall-prefetch` — pre-fetch relevant memories

### Conduits (Cross-device)
- `ConduitDeviceRegistry` — registered devices
- `ConduitSnoopService` — observes conduit data
- `conduitDeviceIdentity` — device identity
- `OptMemConduitSync` — memory sync via conduit

### Dreams
- `dream-client` — client for Dream sessions
- `dream-sessions` — session management
- `list-dreams` — list dream sessions
- `start-dreams` — start a dream session

_"Dreams" = background long-running agent sessions that run while you sleep_

### Chat Script System
- `ChatScriptRunner` — runs scripts inside chat context
- `run` chunk — execution runner
- Skills can include TypeScript/JavaScript code executed in sandbox

### Skills System
- Skills = markdown files with instructions + optionally TypeScript code
- `create-integration.skill.md` found in bundle = skill definition format
- Skills stored in companion profile directory

---

## Authentication: WorkOS

```
@reflect/auth/workos-session
@reflect/auth/desktop
@reflect/auth/device-policy
@reflect/auth/last-login-method
@reflect/auth/oauth-state
@reflect/auth/session-identity
```

WorkOS handles SSO, device management, session tokens.

---

## Data Architecture

### Local Storage (SQLite via Drizzle)
- Chat transcripts
- Companion profiles and memory
- Browser history
- Bookmarks
- Workspace layouts
- Tool execution results
- Routine configs

### Vector Storage (sqlite-vec)
- OptMem note vectors
- Embedding-indexed memories
- Semantic search over chat history

### Synced Storage
- `@reflect/synced-fs` — filesystem sync to backend
- `replica-files` — file replication system
- OptMemSync — memory sync across devices

### File Formats Supported
- PDF (pdfjs-dist)
- Excel/XLSX (SheetJS)
- CSV (csv-parse)
- Images (HEIC, EXIF, NAPI image)
- Audio (WAV, MP3 via lamejs)
- ZIP, TAR

---

## Browser Capabilities

- Chrome extension store integration (`electron-chrome-web-store`)
- Firefox password import (`firefoxPasswordUtil`)
- Apple Keychain import (`importApplePasswords`)
- Safari import (`requestSafariImportAccess`)
- Ad blocking (`@ghostery/adblocker-electron`)
- Tab video previews (`TabVideoPreviews`)
- Display media capture (`DisplayMediaHandler`)
- Window peek (`WindowPeek`)
- Download manager (`electron-dl`)
- WebAuthn / Passkey (`electron-webauthn`, `passkey`)
- Native haptics (`native-haptics`)
- Global keyboard/mouse hooks (`uiohook-napi`)

---

## Infrastructure

- CDN: `strawberrybucket.com` (Cloudflare) — app distribution
- Auth: WorkOS
- Analytics: PostHog
- Errors: Sentry (electron + node-native)
- Auto-update: electron-updater (GitHub Releases or custom server)
- Build: Nx monorepo, Vite bundler
- Native modules: pre-built, unpacked from ASAR

---

## Security Architecture

- Certificate blocklist (`savedCertificateBlocklist`)
- Resource policy (`resourcePolicy` ×2 — renderer + main)
- Sandbox isolation for code execution
- `node:vm` for additional isolation
- WebContents safety checks (build-time: `check:webcontents-safety`)
- Browser import safety checks
- Protocol route checking

---

## What This Means for Our Build

| Their component | Our equivalent |
|----------------|---------------|
| `@reflect/chat-loop` | Build: agent loop with AI SDK 7 |
| `@reflect/companions` | Build: companion profiles + persona system |
| `@reflect/scheduling` | Use: node-cron |
| WorkOS auth | Use: WorkOS (or Clerk as simpler alternative) |
| `@reflect/optmem` + sqlite-vec | Use: sqlite-vec + text-embedding-3-small |
| Vercel AI SDK 7 | Use: same `ai` package |
| Vercel AI Gateway | Use: `anthropic/claude-*` strings |
| `@reflect/synced-fs` | Start: local-only, add sync later |
| Nx monorepo | Use: turborepo (simpler) or Nx |
| Python sandbox | Later: isolated child process |
| 40+ integrations | Phase 2+: start with 5-6 most-used |
| Companion avatars | Build: SVG avatar system |
