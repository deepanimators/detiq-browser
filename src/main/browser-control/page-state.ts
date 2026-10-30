import { webContents, WebContents } from 'electron'

export interface PageState {
  url: string
  title: string
  visibleText: string
  interactiveElements: InteractiveElement[]
}

export interface InteractiveElement {
  tag: string
  text: string
  selector: string
  type?: string
  placeholder?: string
}

const tabWebContentsMap = new Map<string, number>()

export function registerTab(tabId: string, webContentsId: number): void {
  tabWebContentsMap.set(tabId, webContentsId)
}

export function unregisterTab(tabId: string): void {
  tabWebContentsMap.delete(tabId)
}

function getWebContents(tabId: string): WebContents | null {
  const id = tabWebContentsMap.get(tabId)
  if (!id) return null
  return webContents.fromId(id) ?? null
}

export function getWebContentsById(tabId: string): WebContents | null {
  return getWebContents(tabId)
}

export async function capturePageState(tabId: string): Promise<PageState> {
  const wc = getWebContents(tabId)
  if (!wc) {
    return { url: '', title: '', visibleText: '', interactiveElements: [] }
  }

  const url = wc.getURL()
  const title = wc.getTitle()

  const { visibleText, interactiveElements } = await wc.executeJavaScript(`
    (() => {
      const text = document.body?.innerText?.slice(0, 5000) ?? ''
      const elements = Array.from(document.querySelectorAll(
        'a, button, input, textarea, select, [role="button"], [onclick], [tabindex="0"]'
      )).slice(0, 100).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 80),
        selector: el.id ? '#' + el.id : el.className ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase(),
        type: el.getAttribute('type') || undefined,
        placeholder: el.getAttribute('placeholder') || undefined
      }))
      return { visibleText: text, interactiveElements: elements }
    })()
  `)

  return { url, title, visibleText, interactiveElements }
}
