import { ipcMain, webContents } from 'electron'
import { runCompanion, stopCompanion } from '../companion/engine'
import { listCompanionProfiles, getCompanionProfile } from '../companion/profiles'
import { readCompanionMemory, writeCompanionMemory, readSharedMemory, writeSharedMemory } from '../memory/file-memory'
import { registerTab, unregisterTab, capturePageState } from '../browser-control/page-state'
import { scheduleRoutine, stopRoutine } from '../routines/scheduler'

export function setupIpcHandlers(): void {
  // ── Companion ──────────────────────────────────────────────────────────────
  ipcMain.handle('companion:run', async (event, instruction: string, tabId: string, companionId?: string) => {
    const sessionId = crypto.randomUUID()
    runCompanion(sessionId, instruction, tabId, (action) => {
      event.sender.send('companion:action', action)
    }, companionId)
      .then((result) => event.sender.send('companion:complete', result))
      .catch((err) => event.sender.send('companion:complete', { status: 'error', sessionId, error: String(err) }))
    return sessionId
  })

  ipcMain.handle('companion:stop', async (_, sessionId: string) => {
    stopCompanion(sessionId)
    return { ok: true }
  })

  ipcMain.handle('companion:list', async () => listCompanionProfiles())
  ipcMain.handle('companion:get', async (_, id: string) => getCompanionProfile(id))

  // ── Memory ─────────────────────────────────────────────────────────────────
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

  // ── Routines ───────────────────────────────────────────────────────────────
  ipcMain.handle('routines:list', async () => {
    const { listRoutines } = await import('../routines/store')
    return listRoutines()
  })

  ipcMain.handle('routines:create', async (_, routine) => {
    const { createRoutine } = await import('../routines/store')
    const created = createRoutine(routine)
    if (created.enabled && created.trigger_type === 'schedule') {
      scheduleRoutine(created.id, created.instruction, created.trigger_config)
    }
    return created
  })

  ipcMain.handle('routines:delete', async (_, id: string) => {
    stopRoutine(id)
    const { deleteRoutine } = await import('../routines/store')
    return deleteRoutine(id)
  })

  ipcMain.handle('routines:toggle', async (_, id: string, enabled: boolean) => {
    const { toggleRoutine, listRoutines } = await import('../routines/store')
    toggleRoutine(id, enabled)
    const routine = listRoutines().find((r) => r.id === id)
    if (routine) {
      if (enabled && routine.trigger_type === 'schedule') {
        scheduleRoutine(id, routine.instruction, routine.trigger_config)
      } else {
        stopRoutine(id)
      }
    }
    return { ok: true }
  })

  // ── Browser tab control ────────────────────────────────────────────────────
  ipcMain.handle('browser:registerTab', async (_, tabId: string, wcId: number) => {
    registerTab(tabId, wcId)
    return { ok: true }
  })

  ipcMain.handle('browser:unregisterTab', async (_, tabId: string) => {
    unregisterTab(tabId)
    return { ok: true }
  })

  ipcMain.handle('browser:navigate', async (_, tabId: string, url: string) => {
    const { getWebContentsById } = await import('../browser-control/page-state')
    const wc = getWebContentsById(tabId)
    if (wc) wc.loadURL(url)
    return { ok: !!wc }
  })

  ipcMain.handle('browser:back', async (_, tabId: string) => {
    const { getWebContentsById } = await import('../browser-control/page-state')
    const wc = getWebContentsById(tabId)
    if (wc?.canGoBack()) wc.goBack()
    return { ok: true }
  })

  ipcMain.handle('browser:forward', async (_, tabId: string) => {
    const { getWebContentsById } = await import('../browser-control/page-state')
    const wc = getWebContentsById(tabId)
    if (wc?.canGoForward()) wc.goForward()
    return { ok: true }
  })

  ipcMain.handle('browser:refresh', async (_, tabId: string) => {
    const { getWebContentsById } = await import('../browser-control/page-state')
    const wc = getWebContentsById(tabId)
    if (wc) wc.reload()
    return { ok: true }
  })

  ipcMain.handle('browser:getState', async (_, tabId: string) => {
    return capturePageState(tabId)
  })

  ipcMain.handle('browser:screenshot', async (_, tabId: string) => {
    const { getWebContentsById } = await import('../browser-control/page-state')
    const wc = getWebContentsById(tabId)
    if (!wc) return null
    const img = await wc.capturePage()
    return img.toDataURL()
  })
}
