import { getDb, isVecLoaded } from '../storage/db'
import { generateEmbedding, embeddingToBlob } from './embeddings'
import { randomUUID } from 'crypto'

export async function storeMemory(companionId: string, content: string): Promise<void> {
  if (!content.trim()) return
  const db = getDb()

  const embedding = await generateEmbedding(content)
  const embBlob = embedding ? embeddingToBlob(embedding) : null

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO companion_memory (id, companion_id, content, embedding, created_at)
    VALUES (?, ?, ?, ?, unixepoch())
  `).run(randomUUID(), companionId, content.slice(0, 4000), embBlob)

  if (embedding && embBlob) {
    try {
      db.prepare('INSERT INTO vec_memories (rowid, embedding) VALUES (?, ?)').run(lastInsertRowid, embBlob)
    } catch {
      // vec_memories not available — memory still stored without vector index
    }
  }
}

export async function searchMemories(query: string, companionId: string, topK = 5): Promise<string[]> {
  const db = getDb()

  const embedding = await generateEmbedding(query)

  if (embedding && isVecLoaded()) {
    const blob = embeddingToBlob(embedding)
    try {
      // KNN search via sqlite-vec MATCH operator
      const vecRows = db.prepare(`
        SELECT rowid, distance FROM vec_memories
        WHERE embedding MATCH ?
        ORDER BY distance
        LIMIT 20
      `).all(blob) as { rowid: number; distance: number }[]

      if (vecRows.length > 0) {
        const rowIds = vecRows.map((r) => r.rowid)
        const placeholders = rowIds.map(() => '?').join(',')
        const rows = db.prepare(`
          SELECT content FROM companion_memory
          WHERE rowid IN (${placeholders}) AND companion_id = ?
          LIMIT ?
        `).all(...rowIds, companionId, topK) as { content: string }[]
        return rows.map((r) => r.content)
      }
    } catch {
      // Fall through to recency fallback
    }
  }

  // Fallback: most recent memories
  const rows = db.prepare(`
    SELECT content FROM companion_memory
    WHERE companion_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(companionId, topK) as { content: string }[]
  return rows.map((r) => r.content)
}

export function getMemoryCount(companionId: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as c FROM companion_memory WHERE companion_id = ?').get(companionId) as { c: number }
  return row.c
}

export function clearMemory(companionId: string): void {
  const db = getDb()
  const rows = db.prepare('SELECT rowid FROM companion_memory WHERE companion_id = ?').all(companionId) as { rowid: number }[]
  const rowIds = rows.map((r) => r.rowid)
  if (rowIds.length > 0) {
    try {
      const p = rowIds.map(() => '?').join(',')
      db.prepare(`DELETE FROM vec_memories WHERE rowid IN (${p})`).run(...rowIds)
    } catch { /* ignore */ }
  }
  db.prepare('DELETE FROM companion_memory WHERE companion_id = ?').run(companionId)
}
