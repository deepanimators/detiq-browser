# 13 — Vector Memory (OptMem)

> How detiq stores, retrieves, and uses semantic memory for each companion.

---

## Why Vector Memory Matters

File-based markdown memory (our current `file-memory.ts`) has one hard limit: retrieval is all-or-nothing. Every call injects the entire `memory.md` up to a token cap. There is no way to ask "what facts are relevant to *this* task?"

Vector memory solves this. Every fact is embedded into a 1536-dimensional vector when it is stored. At retrieval time, the user's message is embedded and the top-*k* most similar memories are returned — not the full file.

For a companion with 200 stored memories, file-based retrieval gives you the 20 most recent (token limit). Vector retrieval gives you the 5 most *relevant*. The difference is significant in practice: a year-old fact about the user's CRM login is irrelevant to a content drafting task, but very relevant when Sales Sam needs to log a call.

This is what Strawberry calls **OptMem** (`@reflect/optmem`). Our implementation uses the same underlying library: `sqlite-vec`, which is already in our `package.json` and loaded in `db.ts`.

---

## sqlite-vec Integration

`sqlite-vec` is a SQLite extension that adds a `vec0` virtual table type. It ships as a pre-built native module and loads into any `better-sqlite3` instance:

```typescript
// Already in src/main/storage/db.ts
const sqliteVec = require('sqlite-vec')
sqliteVec.load(db)

// Virtual table created at migration time
db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
  embedding float[1536]
)`)
```

### The `vec0` Virtual Table

`vec0` is not a regular table. It is an index structure that supports:
- **INSERT** — store a float array as a row
- **MATCH** — KNN search using cosine distance (the `distance` column)

```sql
-- Insert a vector (id must match companion_memory.id)
INSERT INTO vec_memories(rowid, embedding) VALUES (?, ?);

-- KNN search: top 5 most similar to a query vector
SELECT rowid, distance
FROM vec_memories
WHERE embedding MATCH ?    -- query vector as JSON float array
ORDER BY distance
LIMIT 5;
```

The `MATCH` operator triggers approximate nearest-neighbour search. Results are ordered by ascending cosine distance (0 = identical, 2 = maximally different).

---

## Embedding Pipeline

### Model

We use **OpenAI `text-embedding-3-small`** via `@ai-sdk/openai`. It produces **1536-dimensional** float vectors — the same dimensionality declared in `vec0(embedding float[1536])`.

| Property | Value |
|----------|-------|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Max input tokens | 8,191 |
| Cost | ~$0.02 / 1M tokens |
| Latency | ~100–200ms per call |

At ~100 tokens per memory note, embedding 1,000 memories costs approximately $0.002. This is negligible.

### Caching Strategy

Each memory note is embedded exactly once and the vector is stored in `companion_memory.embedding` (BLOB column). Subsequent reads use the stored vector — no re-embedding unless the content changes.

For the query side (user message → embedding for retrieval), there is no persistent cache since user messages are unique. However, within a single session, if the same companion is queried multiple times with similar messages, we cache the last query embedding in memory for 30 seconds.

### Embedding Function

```typescript
// src/main/memory/embedder.ts
import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

const openai = createOpenAI({ apiKey: process.env['OPENAI_API_KEY'] })

export async function embedText(text: string): Promise<Float32Array> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text
  })
  return new Float32Array(embedding)
}

export function serializeVector(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer)
}

export function deserializeVector(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4)
}
```

---

## Schema

Two tables work together. `companion_memory` is the source of truth (content + metadata). `vec_memories` is the search index (vectors only, linked by rowid).

```sql
-- Primary store: text content + pre-computed embedding
CREATE TABLE IF NOT EXISTS companion_memory (
  id         TEXT    PRIMARY KEY,
  companion_id TEXT  NOT NULL,
  content    TEXT    NOT NULL,
  embedding  BLOB,           -- Float32Array, 1536 * 4 bytes = 6144 bytes per row
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_companion_memory_companion
  ON companion_memory(companion_id);

-- Vector index: rowid matches companion_memory rowid
-- Requires sqlite-vec extension to exist
CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
  embedding float[1536]
);
```

The two tables are linked by `rowid`. When a memory is inserted into `companion_memory`, its integer rowid is immediately used to insert the vector into `vec_memories`. SQLite assigns integer rowids sequentially; we capture them with `db.prepare(...).run(...).lastInsertRowid`.

---

## Memory Lifecycle

### Creation (after task completion)

When a companion successfully completes a task (`task_complete` tool called), the engine extracts durable facts from the conversation and stores them as memory notes:

```typescript
// src/main/memory/vector-memory.ts

export async function storeMemory(
  companionId: string,
  content: string
): Promise<void> {
  const db = getDb()
  const id = crypto.randomUUID()
  const embedding = await embedText(content)
  const blob = serializeVector(embedding)

  const { lastInsertRowid } = db
    .prepare(`INSERT INTO companion_memory (id, companion_id, content, embedding)
              VALUES (?, ?, ?, ?)`)
    .run(id, companionId, content, blob)

  // Mirror into the vector index
  db.prepare(`INSERT INTO vec_memories(rowid, embedding) VALUES (?, ?)`)
    .run(lastInsertRowid, JSON.stringify(Array.from(embedding)))
}
```

### Retrieval (before each AI call)

Before calling the AI, the engine queries for the top-5 memories most relevant to the user's current instruction:

```typescript
export async function recallMemories(
  companionId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  const db = getDb()
  const queryVec = await embedText(query)

  const rows = db.prepare(`
    SELECT cm.content, vm.distance
    FROM vec_memories vm
    JOIN companion_memory cm ON cm.rowid = vm.rowid
    WHERE vm.embedding MATCH ?
      AND cm.companion_id = ?
    ORDER BY vm.distance
    LIMIT ?
  `).all(JSON.stringify(Array.from(queryVec)), companionId, limit) as
    { content: string; distance: number }[]

  return rows.map(r => r.content)
}
```

The returned strings are injected into the system prompt as `## Recalled memories` above the skill context.

### Degradation When Extension Is Unavailable

If `sqlite-vec` fails to load (missing native binary), `vec_memories` does not exist and the `MATCH` query throws. The retrieval function catches this and falls back to recency-based recall: `SELECT content FROM companion_memory WHERE companion_id = ? ORDER BY created_at DESC LIMIT 5`. This is already the behaviour of the current file-based memory — so the fallback matches our baseline.

---

## What Gets Stored vs What Stays in File Memory

We keep both systems. They serve different purposes:

| System | What lives here | Token budget |
|--------|-----------------|-------------|
| File memory (`memory.md`) | Standing instructions, user preferences, communication style, stable facts | ~2,200 tokens (always injected) |
| Vector memory (sqlite-vec) | Task-specific facts, client names, past research findings, one-off context | Top-5 recalled per query |

The file memory is injected wholesale on every call. Vector memory is recalled selectively. Together they give the companion both a stable personality/preference layer and a searchable episodic store.

### What Should Not Be Stored (from Strawberry's memory rules)

- Episodic data: today's meeting outcome, one-time tasks, current statuses
- Procedures: these belong in skills, not memory
- Secrets: passwords, API keys, payment details
- Redundant facts: the same fact twice, even worded differently
- Anything rediscoverable in seconds by looking at a connected app
