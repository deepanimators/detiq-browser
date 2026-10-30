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

interface AutomationRule {
  id: string
  name: string
  trigger_type: 'url_match' | 'schedule' | 'page_content'
  trigger_pattern: string
  companion_id: string
  instruction: string
  enabled: boolean
  last_run?: number
  run_count: number
  created_at: number
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
      navigate: (tabId: string, url: string) => Promise<{ ok: boolean }>
      back: (tabId: string) => Promise<{ ok: boolean }>
      forward: (tabId: string) => Promise<{ ok: boolean }>
      refresh: (tabId: string) => Promise<{ ok: boolean }>
      getState: (tabId: string) => Promise<unknown>
      screenshot: (tabId: string) => Promise<string>
      registerTab: (tabId: string, wcId: number) => Promise<{ ok: boolean }>
      unregisterTab: (tabId: string) => Promise<{ ok: boolean }>
      navigated: (tabId: string, url: string) => Promise<{ triggered: number }>
    }
    memory: {
      read: (companionId: string) => Promise<string>
      write: (companionId: string, content: string) => Promise<{ ok: boolean }>
      readShared: () => Promise<string>
      writeShared: (content: string) => Promise<{ ok: boolean }>
      search: (companionId: string, query: string) => Promise<string[]>
      store: (companionId: string, content: string) => Promise<void>
      count: (companionId: string) => Promise<number>
      clear: (companionId: string) => Promise<void>
    }
    routines: {
      list: () => Promise<unknown[]>
      create: (routine: unknown) => Promise<unknown>
      delete: (id: string) => Promise<void>
      toggle: (id: string, enabled: boolean) => Promise<void>
    }
    skills: {
      list: () => Promise<{ name: string; description: string; companions: string[] }[]>
    }
    automation: {
      list: () => Promise<AutomationRule[]>
      templates: () => Promise<Omit<AutomationRule, 'id' | 'run_count' | 'created_at' | 'last_run'>[]>
      create: (rule: Omit<AutomationRule, 'id' | 'run_count' | 'created_at'>) => Promise<AutomationRule>
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
