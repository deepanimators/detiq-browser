import { webContents } from 'electron'

type Action =
  | { type: 'navigate'; url: string }
  | { type: 'click'; selector: string }
  | { type: 'type'; selector: string; text: string }
  | { type: 'extract'; instructions: string }
  | { type: 'scroll'; direction: 'up' | 'down'; amount?: number }

const tabWebContentsMap = new Map<string, number>()

export function registerTabForActions(tabId: string, webContentsId: number): void {
  tabWebContentsMap.set(tabId, webContentsId)
}

export async function executeAction(tabId: string, action: Action): Promise<unknown> {
  const id = tabWebContentsMap.get(tabId)
  const wc = id ? webContents.fromId(id) : null

  if (!wc) return { error: 'Tab not found' }

  switch (action.type) {
    case 'navigate': {
      await wc.loadURL(action.url)
      await new Promise((resolve) => wc.once('did-finish-load', resolve))
      return { ok: true, url: wc.getURL() }
    }

    case 'click': {
      const result = await wc.executeJavaScript(`
        (() => {
          const sel = ${JSON.stringify(action.selector)}
          const el = document.querySelector(sel) ||
            Array.from(document.querySelectorAll('button, a, [role="button"]'))
              .find(e => e.innerText?.includes(sel))
          if (!el) return { error: 'Element not found: ' + sel }
          el.click()
          return { ok: true, tag: el.tagName, text: el.innerText?.slice(0, 50) }
        })()
      `)
      return result
    }

    case 'type': {
      const result = await wc.executeJavaScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(action.selector)})
          if (!el) return { error: 'Element not found' }
          el.focus()
          el.value = ${JSON.stringify(action.text)}
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return { ok: true }
        })()
      `)
      return result
    }

    case 'extract': {
      // Use Claude to extract structured data from the page
      const pageText = await wc.executeJavaScript(`document.body?.innerText?.slice(0, 8000) ?? ''`)
      return { extracted: pageText, instructions: action.instructions }
    }

    case 'scroll': {
      const amount = action.amount ?? 300
      const delta = action.direction === 'down' ? amount : -amount
      await wc.executeJavaScript(`window.scrollBy(0, ${delta})`)
      return { ok: true }
    }

    default:
      return { error: 'Unknown action type' }
  }
}
