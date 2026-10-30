import { getDb } from '../storage/db'
import { v4 as uuidv4 } from 'uuid'

export interface Routine {
  id: string
  name: string
  instruction: string
  trigger_type: 'schedule' | 'webhook' | 'manual'
  trigger_config: Record<string, unknown>
  enabled: boolean
  last_run?: number
  created_at: number
}

export function listRoutines(): Routine[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM routines ORDER BY created_at DESC').all() as Routine[]
  return rows.map((r) => ({
    ...r,
    trigger_config: JSON.parse(r.trigger_config as unknown as string),
    enabled: Boolean(r.enabled)
  }))
}

export function createRoutine(data: Omit<Routine, 'id' | 'created_at'>): Routine {
  const db = getDb()
  const id = uuidv4()
  const created_at = Math.floor(Date.now() / 1000)

  db.prepare(`
    INSERT INTO routines (id, name, instruction, trigger_type, trigger_config, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.instruction, data.trigger_type, JSON.stringify(data.trigger_config), data.enabled ? 1 : 0, created_at)

  return { id, created_at, ...data }
}

export function deleteRoutine(id: string): void {
  getDb().prepare('DELETE FROM routines WHERE id = ?').run(id)
}

export function toggleRoutine(id: string, enabled: boolean): void {
  getDb().prepare('UPDATE routines SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
}
