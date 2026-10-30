/// <reference types="vite/client" />

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  about: string
  templateInstructions: string
  visualSeed: string
  defaultChatMode: 'expert' | 'standard'
  appIds: string[]
  color: string
}

interface Window {
  api: {
    companion: {
      run: (instruction: string, tabId: string, companionId?: string) => Promise<string>
      stop: (sessionId: string) => Promise<{ ok: boolean }>
      list: () => Promise<CompanionProfile[]>
      get: (id: string) => Promise<CompanionProfile | undefined>
      onAction: (callback: (action: unknown) => void) => void
      onComplete: (callback: (result: unknown) => void) => void
      removeListeners: () => void
    }
    browser: {
      navigate: (tabId: string, url: string) => Promise<unknown>
      getState: (tabId: string) => Promise<unknown>
      screenshot: (tabId: string) => Promise<string>
      registerTab: (tabId: string, wcId: number) => Promise<{ ok: boolean }>
      unregisterTab: (tabId: string) => Promise<{ ok: boolean }>
    }
    memory: {
      read: (companionId: string) => Promise<string>
      write: (companionId: string, content: string) => Promise<{ ok: boolean }>
      readShared: () => Promise<string>
      writeShared: (content: string) => Promise<{ ok: boolean }>
    }
    routines: {
      list: () => Promise<unknown[]>
      create: (routine: unknown) => Promise<unknown>
      delete: (id: string) => Promise<void>
      toggle: (id: string, enabled: boolean) => Promise<void>
    }
  }
}

// Electron webview tag
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        allowpopups?: string
        webpreferences?: string
        nodeintegration?: string
        partition?: string
        useragent?: string
      },
      HTMLElement
    >
  }
}
