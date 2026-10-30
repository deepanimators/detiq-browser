import cron from 'node-cron'
import { listRoutines } from './store'
import { getDb } from '../storage/db'
import { runCompanion } from '../companion/engine'

const activeTasks = new Map<string, cron.ScheduledTask>()

export function startRoutineScheduler(): void {
  // Load and schedule all enabled schedule-triggered routines
  try {
    const routines = listRoutines()
    for (const routine of routines) {
      if (routine.enabled && routine.trigger_type === 'schedule') {
        scheduleRoutine(routine.id, routine.instruction, routine.trigger_config)
      }
    }
    console.log(`[scheduler] started — ${routines.filter((r) => r.enabled && r.trigger_type === 'schedule').length} cron routines active`)
  } catch (err) {
    console.error('[scheduler] init error:', err)
  }
}

export function scheduleRoutine(
  routineId: string,
  instruction: string,
  config: Record<string, unknown>
): void {
  stopRoutine(routineId)

  const cronExpr = (config['cron'] as string) ?? '0 9 * * 1-5' // default: 9am weekdays

  if (!cron.validate(cronExpr)) {
    console.warn(`[scheduler] invalid cron "${cronExpr}" for routine ${routineId}`)
    return
  }

  const task = cron.schedule(cronExpr, async () => {
    console.log(`[scheduler] running routine ${routineId}`)
    const sessionId = crypto.randomUUID()
    try {
      await runCompanion(
        sessionId,
        instruction,
        '', // no active tab — routine runs headlessly
        (action) => console.log(`[routine:${routineId}]`, action),
        undefined
      )
      getDb()
        .prepare('UPDATE routines SET last_run = ? WHERE id = ?')
        .run(Math.floor(Date.now() / 1000), routineId)
    } catch (err) {
      console.error(`[scheduler] routine ${routineId} error:`, err)
    }
  })

  activeTasks.set(routineId, task)
}

export function stopRoutine(routineId: string): void {
  activeTasks.get(routineId)?.stop()
  activeTasks.delete(routineId)
}

export function stopAllRoutines(): void {
  for (const task of activeTasks.values()) task.stop()
  activeTasks.clear()
}
