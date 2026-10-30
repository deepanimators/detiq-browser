# 14 — Autonomous Automation

> How detiq runs companions without user prompting — on a schedule, on navigation, or on page content.

---

## Autonomous Agent vs Chat Assistant

A chat assistant waits. You type; it responds. Every action requires a human in the loop.

An autonomous browser agent acts on its own initiative, triggered by conditions in the world:
- It is 9 AM on a weekday → run the morning brief
- The user navigated to a LinkedIn profile → extract and score the candidate
- The current page contains an invoice total → log it to the finance tracker

The difference is not the AI model. It is the trigger layer: the code that watches the world and decides when to hand control to the companion.

detiq's autonomous automation is built on three trigger types and the `automation_rules` table.

---

## The `automation_rules` Table

Already live in `src/main/storage/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS automation_rules (
  id             TEXT    PRIMARY KEY,
  name           TEXT    NOT NULL,
  trigger_type   TEXT    NOT NULL CHECK(trigger_type IN ('url_match', 'schedule', 'page_content')),
  trigger_pattern TEXT   NOT NULL,   -- cron expr | URL glob | keyword/selector
  companion_id   TEXT    NOT NULL,
  instruction    TEXT    NOT NULL,   -- natural language task sent to companion
  enabled        INTEGER NOT NULL DEFAULT 1,
  last_run       INTEGER,            -- unixepoch of last execution
  run_count      INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
```

| Column | Description |
|--------|-------------|
| `trigger_type` | Which trigger fires this rule |
| `trigger_pattern` | Type-specific: cron string, URL glob, or content selector/keyword |
| `companion_id` | Which companion runs when triggered |
| `instruction` | What the companion is told to do — exactly as if the user typed it |
| `run_count` | Monotonically increasing; used for rate-limiting and auditing |

---

## Trigger Types

### 1. URL Match (`url_match`)

**Pattern:** A glob string matched against the full URL after navigation completes.

```
trigger_pattern examples:
  "https://linkedin.com/in/*"
  "https://*.stripe.com/invoices/*"
  "https://github.com/*/pull/*"
```

**How it fires:**

1. The main process listens to `webContents.on('did-navigate')` on every tab's WebContents.
2. After navigation settles (`did-stop-loading`), it loads all enabled `url_match` rules from `automation_rules`.
3. It tests the new URL against each rule's `trigger_pattern` using a glob matcher.
4. On match: calls `runCompanion(sessionId, rule.instruction, tabId, ..., rule.companion_id)`.
5. The companion starts immediately — no user prompt required.

```typescript
// src/main/automation/url-trigger.ts

import { minimatch } from 'minimatch'
import { getDb } from '../storage/db'
import { runCompanion } from '../companion/engine'

export function registerUrlTriggers(webContents: Electron.WebContents, tabId: string): void {
  webContents.on('did-stop-loading', async () => {
    const url = webContents.getURL()
    const rules = getDb()
      .prepare(`SELECT * FROM automation_rules
                WHERE trigger_type = 'url_match' AND enabled = 1`)
      .all() as AutomationRule[]

    for (const rule of rules) {
      if (minimatch(url, rule.trigger_pattern)) {
        const sessionId = crypto.randomUUID()
        await runCompanion(sessionId, rule.instruction, tabId,
          (action) => console.log(`[automation:${rule.id}]`, action),
          rule.companion_id
        )
        getDb()
          .prepare(`UPDATE automation_rules
                    SET last_run = ?, run_count = run_count + 1
                    WHERE id = ?`)
          .run(Math.floor(Date.now() / 1000), rule.id)
      }
    }
  })
}
```

**Debounce:** URL triggers are debounced to once per 60 seconds per rule per tab to avoid re-firing on fragment changes or in-page redirects.

---

### 2. Schedule (`schedule`)

**Pattern:** A standard cron expression, evaluated by `node-cron`.

```
trigger_pattern examples:
  "0 9 * * 1-5"       — weekdays at 9 AM
  "0 */4 * * *"       — every 4 hours
  "0 18 * * 5"        — Fridays at 6 PM
```

This is the same mechanism used for the existing `routines` system. `automation_rules` with `trigger_type = 'schedule'` are loaded by `startRoutineScheduler()` alongside routines — the code path is identical. The distinction is UI-facing: Routines are user-created tasks; automation rules are companion-registered background jobs.

**How it fires:**

On app startup, `startRoutineScheduler()` reads all enabled `schedule` rules and creates `cron.ScheduledTask` instances. When the cron fires, `runCompanion` is called headlessly (no active tab — the companion navigates to the relevant URL itself as part of its instruction).

---

### 3. Page Content (`page_content`)

**Pattern:** A CSS selector or keyword that is tested against the live page DOM.

```
trigger_pattern examples:
  ".invoice-total"            — element exists with this class
  "[data-testid='checkout']"  — checkout page detected
  "keyword:pricing"           — visible text contains "pricing"
```

**How it fires:**

After `did-stop-loading`, in addition to URL matching, detiq runs a lightweight content check:

```typescript
// After page loads, check page_content rules
const contentRules = db.prepare(
  `SELECT * FROM automation_rules WHERE trigger_type = 'page_content' AND enabled = 1`
).all()

const pageText = await webContents.executeJavaScript(`document.body.innerText`)

for (const rule of contentRules) {
  const pattern = rule.trigger_pattern
  let matched = false

  if (pattern.startsWith('keyword:')) {
    matched = pageText.toLowerCase().includes(pattern.slice(8).toLowerCase())
  } else {
    // CSS selector check
    matched = await webContents.executeJavaScript(
      `!!document.querySelector(${JSON.stringify(pattern)})`
    )
  }

  if (matched) { /* fire companion */ }
}
```

Content triggers are rate-limited more aggressively than URL triggers (once per 10 minutes per rule per session) because many pages could match broad keywords.

---

## Use Cases

| Rule | Trigger Type | Pattern | Companion | Instruction |
|------|-------------|---------|-----------|-------------|
| Auto-summarise LinkedIn profiles | url_match | `https://linkedin.com/in/*` | Talent Ren | "Extract this person's name, current role, company, years of experience, and top 3 skills. Score them against our standard scorecard." |
| Extract pricing on product pages | page_content | `keyword:pricing` | Research Ria | "Extract all pricing tiers from this page — plan name, monthly cost, annual cost, and key features — into a table." |
| Morning brief | schedule | `0 9 * * 1-5` | Executive Eva | "Open Gmail and summarise unread emails from the last 24 hours. Flag anything that needs a response today." |
| Auto-log GitHub PR activity | url_match | `https://github.com/*/pull/*` | Developer Dev | "Extract the PR title, author, status, and number of review comments. Log it to my activity tracker." |
| Meeting auto-notes | url_match | `https://meet.google.com/*` | Operations Owen | "This is a Google Meet. When the meeting ends, summarise the discussion and extract action items." |
| Invoice detection | page_content | `.invoice-total` | Finance Finn | "Extract the vendor name, invoice number, total amount, and due date from this invoice. Log it to my spreadsheet." |

---

## Current Implementation vs Roadmap

### Current (Phase 1)

| Capability | Status |
|------------|--------|
| `automation_rules` table created | Done |
| `schedule` trigger via node-cron | Done (shared with routines) |
| `url_match` trigger registration | Planned — requires `did-stop-loading` wiring |
| `page_content` trigger | Planned — requires content check after navigation |
| Result surfaced in UI | Not implemented — actions logged to console only |
| Cooldown / rate limiting | Not implemented |

### Phase 2

- **Result routing:** After an automation runs, its output is shown as a notification chip below the address bar ("Talent Ren found 3 matches — review?") with a link to open the full companion conversation.
- **User confirmation mode:** Rules can be set to `requires_approval = 1`, which halts the companion at `request_approval` and shows a dialog before any write action.
- **Cooldown column:** Add `cooldown_seconds` to `automation_rules`. Default 60s for URL triggers, 600s for content triggers.

### Phase 3

- **Multi-step workflows:** Chain multiple rules: Rule A output → triggers Rule B. Implemented as a `next_rule_id` foreign key.
- **Approval flows:** Integrate with a tray notification or browser overlay so the user can approve/reject autonomously triggered actions without switching focus.
- **Result routing to apps:** Instead of showing output in the companion sidebar, route it directly to a connected integration — a Google Sheet row, a Linear issue, a Slack message — without user intervention beyond the initial rule setup.
- **Event triggers:** New email arrival, new GitHub issue, webhook from external service. Requires a local webhook listener (`http://localhost:{port}`) that the external service POSTs to.
