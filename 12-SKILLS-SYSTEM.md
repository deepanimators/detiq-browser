# 12 — Skills System

> How detiq loads domain expertise into companion context at inference time.

---

## What Skills Are

Skills are **plain markdown files injected into a companion's system prompt** before an AI call. They are not code — they are context. A skill file contains instructions, best practices, playbooks, and examples that the companion would otherwise have to infer or ask about.

In Strawberry Browser's `@reflect/skills` package, every companion ships with `templateSkills` — a list of official skill paths that load automatically when that companion is active. Custom skills can be added per-companion.

In detiq, skills follow the same design: a markdown file on disk, selected by trigger matching, merged into the companion's `system` prompt.

---

## Strawberry's 31 Official Skills (source: ASAR analysis)

Grouped by domain as found in the companion profiles:

| Category | Skill Path | Description |
|----------|------------|-------------|
| Memory | `strawberry/memory-best-practices` | Rules for what to memorise and how |
| Memory | `strawberry/memory-writing-guide` | Plain-sentence memory writing style |
| Execution | `strawberry/routines` | How to create and run routines |
| Execution | `strawberry/skill-authoring` | How to write new skills |
| Writing | `strawberry/natural-writing` | Voice and tone guide |
| Data | `strawberry/spreadsheets` | Google Sheets extraction and formatting |
| Data | `strawberry/research` | Sourced research with URL citations |
| Sales | `strawberry/sales/getting-started-with-sales-in-strawberry` | Sales setup workflow |
| Sales | `strawberry/sales/lead-research` | Prospect research playbook |
| Sales | `strawberry/sales/outreach-writing` | Personalised cold outreach |
| Sales | `strawberry/sales/crm-updates` | CRM data entry patterns |
| Recruiting | `strawberry/talent/sourcing` | LinkedIn + GitHub candidate sourcing |
| Recruiting | `strawberry/talent/scorecards` | Scorecard from top-performer analysis |
| Marketing | `strawberry/marketing/content-creation` | Channel-specific content formats |
| Marketing | `strawberry/marketing/competitor-monitoring` | Competitor tracking patterns |
| Support | `strawberry/support/triage` | Support inbox triage playbook |
| Support | `strawberry/support/bug-routing` | Bug report format and routing |
| Operations | `strawberry/operations/daily-brief` | Morning brief template |
| Operations | `strawberry/operations/meeting-prep` | Pre-meeting research |
| Developer | `strawberry/developer/qa-testing` | Browser QA methodology |
| Developer | `strawberry/developer/bug-filing` | Reproducible bug report format |
| Executive | `strawberry/executive/inbox-management` | Email triage and drafting |
| Executive | `strawberry/executive/calendar-management` | Scheduling and meeting management |
| Integrations | `strawberry/integrations/gmail` | Gmail tool usage patterns |
| Integrations | `strawberry/integrations/slack` | Slack tool usage patterns |
| Integrations | `strawberry/integrations/linear` | Linear issue creation patterns |
| Integrations | `strawberry/integrations/github` | GitHub PR and issue patterns |
| Integrations | `strawberry/integrations/notion` | Notion page writing patterns |
| Integrations | `strawberry/integrations/sheets` | Sheets read/write patterns |
| Integrations | `strawberry/integrations/linkedin` | LinkedIn profile research |
| Integrations | `strawberry/integrations/ashby` | Ashby ATS candidate management |

### Mapping to detiq's 9 Companions

| detiq Companion | Primary Skills Loaded |
|----------------|-----------------------|
| Sales Sam | `sales`, `lead-research`, `outreach-writing`, `natural-writing` |
| Research Ria | `research`, `spreadsheets`, `natural-writing` |
| Developer Dev | `qa-testing`, `bug-filing`, `github` |
| Operations Owen | `daily-brief`, `meeting-prep`, `routines` |
| Marketing Maya | `content-creation`, `competitor-monitoring`, `natural-writing` |
| Support Sol | `triage`, `bug-routing`, `inbox-management` |
| Executive Eva | `inbox-management`, `calendar-management`, `daily-brief` |
| Talent Ren | `sourcing`, `scorecards`, `linkedin` |
| Finance Finn | `spreadsheets`, `natural-writing` |

All companions also load `memory-best-practices` and `memory-writing-guide` automatically.

---

## detiq's 12 Skills (Phase 1 Implementation)

| File | Trigger Keywords | Companions |
|------|-----------------|------------|
| `memory-best-practices.md` | always | all |
| `natural-writing.md` | always | all |
| `research.md` | research, source, find, investigate, look up | research-ria |
| `spreadsheets.md` | sheet, spreadsheet, table, csv, export data | research-ria, finance-finn |
| `sales.md` | lead, prospect, outreach, cold email, pipeline | sales-sam |
| `recruiting.md` | candidate, hire, scorecard, source, linkedin | talent-ren |
| `content-creation.md` | post, content, copy, draft, campaign | marketing-maya |
| `competitor-monitoring.md` | competitor, track, monitor, pricing page | marketing-maya |
| `daily-brief.md` | brief, morning, summary, today | operations-owen, executive-eva |
| `qa-testing.md` | test, bug, click through, reproduce | developer-dev |
| `bug-filing.md` | file bug, issue, report, linear, github | developer-dev |
| `inbox-triage.md` | email, inbox, reply, triage, gmail | support-sol, executive-eva |

---

## Skill File Format

Every skill file uses YAML frontmatter followed by markdown instructions.

```markdown
---
name: Research Playbook
description: How to research any topic with sourced, credible findings
triggers:
  - research
  - source
  - investigate
  - find information
companions:
  - research-ria
  - sales-sam
---

# Research Playbook

## Core rule
Every factual claim needs a source URL. Never state something as fact without a link.

## Steps for any research task
1. Start with a search to understand the landscape
2. Open the 3-5 most credible sources in separate tabs
3. Extract the relevant facts from each
4. Note disagreements between sources — explain which you trust and why
5. Synthesise into a brief with citations inline

## Output format
- Lead with the answer, not the methodology
- Use a table when comparing across multiple items
- End with a "Sources" section listing every URL referenced
```

---

## Skill Loader Implementation

Skills live on disk at `userData/skills/`. The loader is a lightweight file reader — no compilation, no bundling.

```typescript
// src/main/skills/loader.ts

import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export interface Skill {
  name: string
  description: string
  triggers: string[]
  companions: string[]
  body: string  // the markdown below the frontmatter
}

export async function loadSkillsForCompanion(
  companionId: string,
  userMessage: string
): Promise<Skill[]> {
  const skillsDir = join(app.getPath('userData'), 'skills')
  const allSkills = await readAllSkills(skillsDir)

  return allSkills.filter(skill =>
    // Always-load skills (companions list is empty = universal)
    (skill.companions.length === 0 || skill.companions.includes(companionId)) &&
    // Trigger match: at least one trigger keyword appears in the user message
    (skill.triggers.length === 0 || skill.triggers.some(t =>
      userMessage.toLowerCase().includes(t.toLowerCase())
    ))
  )
}

export function injectSkillsIntoSystemPrompt(
  basePrompt: string,
  skills: Skill[]
): string {
  if (skills.length === 0) return basePrompt

  const skillContext = skills
    .map(s => `## Skill: ${s.name}\n\n${s.body}`)
    .join('\n\n---\n\n')

  return `${basePrompt}\n\n---\n\n# Active Skills\n\n${skillContext}`
}
```

---

## Trigger Matching

Trigger matching runs before each AI call using the raw user message text. Rules:

1. Skills with an empty `triggers` array load for every call (universal skills like `memory-best-practices`).
2. Skills with a non-empty `triggers` array require at least one keyword match in the lowercased user message.
3. Skills with a non-empty `companions` array only load for those companion IDs.
4. When multiple skills match, all are injected — no limit in Phase 1.

Matching is intentionally naive (substring, not semantic) to keep latency near zero. Semantic trigger matching (embed user message, cosine-match against skill embeddings) is a Phase 3 enhancement.

---

## How Skills Are Injected Per Task

```
User sends message
        │
        ▼
loadSkillsForCompanion(companionId, message)
        │ returns matched Skill[]
        ▼
buildMemoryContext(companionId)
        │ returns markdown memory
        ▼
injectSkillsIntoSystemPrompt(profile.templateInstructions, skills)
        │ returns enriched system prompt
        ▼
runCompanion(sessionId, instruction, tabId, ...)
        │ uses enriched system prompt
        ▼
AI call with full context
```

The total injected context (skills + memory) is capped at **3,000 tokens** to avoid bloating every call. Skills are trimmed in reverse priority order (most-recently-added first) if the limit is exceeded.

---

## Skill Authoring Guide

To add a new skill:

1. Create `userData/skills/<slug>.md` with the frontmatter above.
2. Set `companions` to the companion IDs that should use it, or leave empty for all.
3. Set `triggers` to 2–5 keywords that indicate the user needs this domain knowledge.
4. Write the body as actionable instructions, not background information.

**Good skill body:**
- Tells the companion *what to do*, not what is true
- Uses numbered steps for procedures, tables for comparisons
- Is under 500 tokens so it doesn't crowd other context

**Bad skill body:**
- Background reading ("Research is the practice of...")
- Exhaustive reference material (use a link instead)
- Duplicate of what the companion persona already knows

Ship new skills without an app update — they load from disk on every call.
