import { ipcMain } from 'electron'
import { runCompanion, stopCompanion } from '../companion/engine'
import { listCompanionProfiles, getCompanionProfile } from '../companion/profiles'
import { readCompanionMemory, writeCompanionMemory, readSharedMemory, writeSharedMemory } from '../memory/file-memory'
import { registerTab, unregisterTab } from '../browser-control/page-state'

export function setupIpcHandlers(): void {
  // Companion: run / stop
  ipcMain.handle('companion:run', async (event, instruction: string, tabId: string, companionId?: string) => {
    const sessionId = crypto.randomUUID()
    runCompanion(sessionId, instruction, tabId, (action) => {
      event.sender.send('companion:action', action)
    }, companionId).then((result) => {
      event.sender.send('companion:complete', result)
    }).catch((err) => {
      event.sender.send('companion:complete', { status: 'error', sessionId, error: String(err) })
    })
    return sessionId
  })

  ipcMain.handle('companion:stop', async (_, sessionId: string) => {
    stopCompanion(sessionId)
    return { ok: true }
  })

  // Companion profiles
  ipcMain.handle('companion:list', async () => listCompanionProfiles())
  ipcMain.handle('companion:get', async (_, id: string) => getCompanionProfile(id))

  // Memory
  ipcMain.handle('memory:read', async (_, companionId: string) => readCompanionMemory(companionId))
  ipcMain.handle('memory:write', async (_, companionId: string, content: string) => {
    await writeCompanionMemory(companionId, content)
    return { ok: true }
  })
  ipcMain.handle('memory:readShared', async () => readSharedMemory())
  ipcMain.handle('memory:writeShared', async (_, content: string) => {
    await writeSharedMemory(content)
    return { ok: true }
  })

  // Routines
  ipcMain.handle('routines:list', async () => {
    const { listRoutines } = await import('../routines/store')
    return listRoutines()
  })

  ipcMain.handle('routines:create', async (_, routine) => {
    const { createRoutine } = await import('../routines/store')
    return createRoutine(routine)
  })

  ipcMain.handle('routines:delete', async (_, id: string) => {
    const { deleteRoutine } = await import('../routines/store')
    return deleteRoutine(id)
  })

  ipcMain.handle('routines:toggle', async (_, id: string, enabled: boolean) => {
    const { toggleRoutine } = await import('../routines/store')
    return toggleRoutine(id, enabled)
  })

  // Tab registration — called by renderer after webview mounts
  ipcMain.handle('browser:registerTab', async (_, tabId: string, wcId: number) => {
    registerTab(tabId, wcId)
    return { ok: true }
  })

  ipcMain.handle('browser:unregisterTab', async (_, tabId: string) => {
    unregisterTab(tabId)
    return { ok: true }
  })
}
