import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  companion: {
    run: (instruction: string, tabId: string, companionId?: string) =>
      ipcRenderer.invoke('companion:run', instruction, tabId, companionId),
    stop: (sessionId: string) => ipcRenderer.invoke('companion:stop', sessionId),
    list: () => ipcRenderer.invoke('companion:list'),
    get: (id: string) => ipcRenderer.invoke('companion:get', id),
    onAction: (callback: (action: unknown) => void) => {
      ipcRenderer.on('companion:action', (_, action) => callback(action))
    },
    onComplete: (callback: (result: unknown) => void) => {
      ipcRenderer.on('companion:complete', (_, result) => callback(result))
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('companion:action')
      ipcRenderer.removeAllListeners('companion:complete')
    }
  },
  browser: {
    navigate: (tabId: string, url: string) => ipcRenderer.invoke('browser:navigate', tabId, url),
    back: (tabId: string) => ipcRenderer.invoke('browser:back', tabId),
    forward: (tabId: string) => ipcRenderer.invoke('browser:forward', tabId),
    refresh: (tabId: string) => ipcRenderer.invoke('browser:refresh', tabId),
    getState: (tabId: string) => ipcRenderer.invoke('browser:getState', tabId),
    screenshot: (tabId: string) => ipcRenderer.invoke('browser:screenshot', tabId),
    registerTab: (tabId: string, wcId: number) => ipcRenderer.invoke('browser:registerTab', tabId, wcId),
    unregisterTab: (tabId: string) => ipcRenderer.invoke('browser:unregisterTab', tabId),
    navigated: (tabId: string, url: string) => ipcRenderer.invoke('browser:navigated', tabId, url)
  },
  memory: {
    read: (companionId: string) => ipcRenderer.invoke('memory:read', companionId),
    write: (companionId: string, content: string) => ipcRenderer.invoke('memory:write', companionId, content),
    readShared: () => ipcRenderer.invoke('memory:readShared'),
    writeShared: (content: string) => ipcRenderer.invoke('memory:writeShared', content),
    search: (companionId: string, query: string) => ipcRenderer.invoke('memory:search', companionId, query),
    store: (companionId: string, content: string) => ipcRenderer.invoke('memory:store', companionId, content),
    count: (companionId: string) => ipcRenderer.invoke('memory:count', companionId),
    clear: (companionId: string) => ipcRenderer.invoke('memory:clear', companionId)
  },
  routines: {
    list: () => ipcRenderer.invoke('routines:list'),
    create: (routine: unknown) => ipcRenderer.invoke('routines:create', routine),
    delete: (id: string) => ipcRenderer.invoke('routines:delete', id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('routines:toggle', id, enabled)
  },
  skills: {
    list: () => ipcRenderer.invoke('skills:list')
  },
  automation: {
    list: () => ipcRenderer.invoke('automation:list'),
    templates: () => ipcRenderer.invoke('automation:templates'),
    create: (rule: unknown) => ipcRenderer.invoke('automation:create', rule),
    delete: (id: string) => ipcRenderer.invoke('automation:delete', id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('automation:toggle', id, enabled)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
