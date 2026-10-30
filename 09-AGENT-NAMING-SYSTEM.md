# Strawberry Agent Naming System — Deep Dive

## Naming Convention

All official companions follow: **`{role}-{first-name}`** pattern.

| Role | First Name | ID | Original Codename |
|------|-----------|----|--------------------|
| consulting | Cora | `consulting-cora` | `consulting-cora` (unchanged) |
| developer | Dana | `developer-dana` | `developer-dana` (unchanged) |
| executive | Ellis | `executive-ellis` | `office-otis` ← renamed |
| marketing | Martin | `marketing-martin` | `marketing-martin` (unchanged) |
| operations | Olivia | `operations-olivia` | `operations-olivia` (unchanged) |
| research | Rosa | `research-rosa` | `research-rosa` (unchanged) |
| sales | Sally | `sales-sally` | `pipeline-pia` ← renamed |
| support | Sofia | `support-sofia` | `support-saga` ← renamed |
| talent | Theo | `talent-theo` | `talent-tove` ← renamed |

**Key insight:** The visual seed (internal avatar identifier) retains the **original codename**, not the final name. This means:
- `executive-ellis` renders from seed `004j-office-otis`
- `sales-sally` renders from seed `0002-pipeline-pia`
- `support-sofia` renders from seed `001u-support-saga`
- `talent-theo` renders from seed `005y-talent-tove`

This was a deliberate rebrand — original names were more neutral/Scandinavian (Otis, Pia, Saga, Tove).

---

## Visual Seed Format

```
{4-char-hex-like-id}-{kebab-case-original-name}
```

Examples:
- `0002-consulting-cora`
- `000m-developer-dana`
- `004j-office-otis`
- `0012-marketing-martin`
- `000e-operations-olivia`
- `0017-research-rosa`
- `0002-pipeline-pia`
- `001u-support-saga`
- `005y-talent-tove`

The 4-char prefix appears to be a sequential hex-like counter. The seed is used for deterministic procedural avatar generation — same seed = same avatar every time.

---

## Companion Identity Architecture

```typescript
interface CompanionDefinition {
  id: string           // kebab-case: "consulting-cora"
  contentHash: string  // SHA-256 of profile content (for versioning)
  profile: CompanionProfile
  runtime: CompanionRuntime
}

interface CompanionProfile {
  summary: string          // one-liner shown in marketplace
  about: string           // multi-sentence intro message shown in chat
  templateInstructions: string  // the actual system prompt
  templateSkills: Skill[]       // linked official skills
  customSkills: CustomSkill[]   // per-companion custom skills
  appIds: string[]              // linked integrations
  featuredSkills: FeaturedSkill[]
  posts: Post[]                 // sample content companion can create
  selectedPaths: string[]       // pinned paths
  featuredPaths: string[]
  customSkillIds: string[]
  schemaVersion: number
}

interface CompanionRuntime {
  name: string              // display name: "Consulting Cora"
  visualsSeed: string       // "0002-consulting-cora" — avatar determinism
  description: string       // same as profile.summary
  appearance: CompanionAppearance
  defaultChatMode: "expert" | "standard"
}
```

---

## Avatar Appearance System

Each companion has a fully specified procedural avatar:

```typescript
interface CompanionAppearance {
  schemaVersion: 1
  body: { type: BodyType; size: number }        // body_0
  head: { type: HeadType; size: number }        // head_oval
  eyes: { type: EyeType; size: number; x: number; z: number }
  mouth: { type: MouthType; size: number; z: number }
  pupil: { type: PupilType; size: number; x: number; z: number }
  hat: { type: HatType }                        // none | hat_* 
  eyebrow: { type: EyebrowType; size: number; x: number; z: number; zOffset: number; rotationY: number }
  hair: { type: HairType }                      // hair_shelley | hair_* 
  eyeAccessory: { type: AccessoryType; size: number; z: number }
  earAccessory: { type: EarAccessoryType; layout: string; size: number }
  color: {
    body: string    // hex, e.g. "#6B4242"
    head: string    // hex
    accent: string  // hex
    accessory: string // hex
    ear: string     // hex
    hair: string    // hex
  }
}
```

### Cora's Avatar (example)
```json
{
  "body": { "type": "body_0", "size": 1 },
  "head": { "type": "head_oval", "size": 0.55 },
  "eyes": { "type": "eye_sharper", "size": 0.46, "x": 0.5, "z": 0.5 },
  "mouth": { "type": "mouth_0", "size": 0.45, "z": 0.4 },
  "pupil": { "type": "pupil_0", "size": 0.35, "x": 0.5, "z": 0.5 },
  "hat": { "type": "none" },
  "eyebrow": { "type": "eyebrow_0", "size": 0.48, "x": 0.5, "z": 0.5, "zOffset": 0.33, "rotationY": 0.1 },
  "hair": { "type": "hair_shelley" },
  "eyeAccessory": { "type": "none", "size": 0.65, "z": 0.5 },
  "earAccessory": { "type": "earrings_big_hoop", "layout": "mirrored", "size": 0.5 },
  "color": {
    "body": "#6B4242",
    "head": "#E09494",
    "accent": "#6B4242",
    "accessory": "#D45757",
    "ear": "#D67878",
    "hair": "#AF4C3F"
  }
}
```

---

## Companion Intro Messages (verbatim from ASAR)

### Consulting Cora
> Hi, I'm Consulting Cora. I help you win clients and keep every one of them well looked after. I find companies that could use what you offer, turn client calls into proposals, research clients before kickoff, and put together progress and time reports from your tools. Each client's context stays separate. I won't send anything without your OK until you trust me enough to work on autopilot.

### Developer Dana
> Hi, I'm Developer Dana. I click through your app in a real browser to find what breaks, debug with the console and network requests, file bugs your team can reproduce, research docs for the next feature, and create or review pull requests. I also turn customer feedback into product insight. I won't commit or send a PR without your OK.

### Executive Ellis
> Hi, I'm Executive Ellis. Everything you owe anyone goes on one list. Every morning you get a brief of who you're meeting and what's due. I sort your inbox and draft replies that sound like you, and every evening I line up tomorrow so you can start with a plan instead of a pile.

### Marketing Martin
> Hi, I'm Marketing Martin. I start with what already worked for you, then turn it into content for every channel in your voice, keep an eye on competitors and what people say about you, and plan campaigns from real data. I won't post or send anything without your OK.

### Operations Olivia
> Hi, I'm Operations Olivia. I keep the work moving: a brief every morning, meetings prepared and followed up, promises nobody followed up on closed, the weekly update written, and recurring admin like invoices, reports, and renewals handled. I won't send or submit anything without your OK.

### Research Rosa
> Hi, I'm Research Rosa. Tell me what decision you're making and I'll research it in a real browser, with a source for every claim. I map markets, pull data from the web into spreadsheets, turn findings into briefings, and keep watch on what you care about so changes reach you when they happen.

### Sales Sally
> Hi, I'm Sales Sally. Tell me what you sell and name a few of your best customers, and I'll learn what they have in common, find more companies like them, write to the right person in your voice, and handle follow-ups. I won't send anything without your OK until you trust me enough to run on autopilot.

### Support Sofia
> Hi, I'm Support Sofia. Every morning I read every place your customers reach you and turn it into one short brief: what needs your decision, which replies are ready to send, and what I've already handled. I route real bugs to your tracker with evidence. I won't reply or close anything without your OK.

### Talent Theo
> Hi, I'm Talent Theo. Tell me which role matters most and who on your team is already great at it. I turn that into a scorecard, map where people like them work, and bring you verified, scored candidates every week. I won't reach out to anyone without your OK.

---

## System Prompt Philosophy

From `templateInstructions` in official-companions.generated:

```
You're one of Strawberry's official companions, focused on [domain]. You start out as [Name] 
with a few default suggestions, but as you work with the user you evolve: you learn their 
preferences, become part of their team, and might get a new name, look, and personality.

Your original goal is [goal]. That goal can grow and change over time.

You're new on the user's team, and you're genuinely excited to learn how they work, because 
that is what makes everything you do for them better. While you're still getting to know them, 
keep gathering context in every chat. Your setup skill says what to learn first. Ask for real 
examples, what to avoid, and where their work lives, and offer to learn it from their connected 
apps and sent messages instead of making them type it. Build on what they already told you, ask 
one or two things at a time between steps of real work, and play back what you understood so 
they can correct it.
```

**Key design principles:**
1. Companion evolves — starts as template, becomes personalized
2. Curious, not prescriptive — asks rather than assumes
3. Learns from connected apps, not just user typing
4. Confirms understanding before acting
5. Never acts autonomously on irreversible actions without trust built
6. Has a "setup skill" that defines what to learn first

---

## Memory File Structure (File-System Based)

Strawberry stores companion memory as **markdown files on disk**, not in SQL.

```
~/.strawberry/profiles/{profile-id}/
├── shared/
│   ├── global.md              ← shared facts about user (across all companions)
│   ├── best-practices/
│   │   ├── recruiting.md      ← domain playbooks
│   │   ├── sales.md
│   │   ├── scraping.md
│   │   └── official-skills.md ← full skills catalog
│   └── ...
└── companions/
    └── {companion-id}/
        ├── personality.md     ← "# Companion personality" section
        └── memory.md          ← "# Companion memory" section
```

### Memory File Sections

```markdown
# Companion personality
[who the companion has become, preferences, communication style]

# Companion memory
[durable facts, preferences, standing instructions, patterns]
```

### Memory Token Limits
- Profile memory: **1800 tokens**
- Companion memory: **2200 tokens**

### Memory Writing Rules (from ASAR)
**What belongs:**
- Durable facts and preferences (still hold weeks from now)
- Standing instructions, corrected behaviors
- Repeated patterns and routines
- Stable facts: where something lives, which account to use, who to ask

**What does NOT belong:**
- Episodic data (today's meetings, one-off tasks, statuses)
- Procedures (belong in skills)
- Things rediscoverable in seconds
- Same fact twice
- Secrets (passwords, tokens, payment details)

**How to write:**
- Plain sentences with verbs, full words
- One fact or rule per line
- No abbreviations, symbols, chained semicolons
- Short by saying less, not by compressing

---

## Companion Naming for Our Build (detiq)

Following Strawberry's pattern — role + alliterative/memorable first name:

### Recommended Names for detiq Companions

| Role | Name | ID | Tagline |
|------|------|----|---------|
| Sales | **Sam** | `sales-sam` | Finds your next customers |
| Research | **Ria** | `research-ria` | Sourced answers, every claim backed |
| Developer | **Dev** | `developer-dev` | QA, bugs, product insight |
| Operations | **Owen** | `operations-owen` | Keeps work moving |
| Marketing | **Maya** | `marketing-maya` | Your voice across every channel |
| Support | **Sol** | `support-sol` | Inbox handled, customers answered |
| Executive | **Eva** | `executive-eva` | Chief of staff for your day |
| Recruiting | **Ren** | `talent-ren` | Great candidates, verified |
| Finance | **Finn** | `finance-finn` | Numbers tracked, reports ready |

### Naming Rules
1. `{role}-{first-name}` format for IDs
2. First name alliterates with role when possible
3. Gender-neutral or mixed — don't make all one gender
4. Short (4-5 chars ideal for first name)
5. Memorable, not corporate

---

## contentHash System

Each companion definition has a `contentHash` (SHA-256 of profile content).

**Purpose:**
- Detect when Strawberry updates an official companion's definition
- Prompt user to accept updated persona
- Preserve user customizations during updates

**Our implementation:** Hash the companion profile JSON on write, store hash, detect changes on load.
