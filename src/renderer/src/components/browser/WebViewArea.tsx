import { useEffect, useRef, useCallback } from 'react'
import { Tab } from '../layout/BrowserLayout'

interface WebviewTag extends HTMLElement {
  getWebContentsId(): number
  getTitle(): string
  getURL(): string
  isReady?(): boolean
}

interface Props {
  tab: Tab
  visible: boolean
  onTitleChange: (tabId: string, title: string) => void
  onFaviconChange: (tabId: string, favicon: string) => void
  onLoadingChange: (tabId: string, loading: boolean) => void
  onUrlChange: (tabId: string, url: string) => void
}

export default function WebViewArea({
  tab, visible,
  onTitleChange, onFaviconChange, onLoadingChange, onUrlChange
}: Props) {
  const webviewRef = useRef<WebviewTag>(null)
  const eventsAttached = useRef(false)

  // Always-current refs so event listeners never capture stale callbacks
  const onTitleChangeRef = useRef(onTitleChange)
  const onFaviconChangeRef = useRef(onFaviconChange)
  const onLoadingChangeRef = useRef(onLoadingChange)
  const onUrlChangeRef = useRef(onUrlChange)
  onTitleChangeRef.current = onTitleChange
  onFaviconChangeRef.current = onFaviconChange
  onLoadingChangeRef.current = onLoadingChange
  onUrlChangeRef.current = onUrlChange

  const attachEvents = useCallback(() => {
    const wv = webviewRef.current
    if (!wv || eventsAttached.current) return
    eventsAttached.current = true

    wv.addEventListener('page-title-updated', (e: Event) => {
      onTitleChangeRef.current(tab.id, (e as CustomEvent & { title: string }).title)
    })

    wv.addEventListener('page-favicon-updated', (e: Event) => {
      const favicons = (e as CustomEvent & { favicons: string[] }).favicons
      if (favicons?.[0]) onFaviconChangeRef.current(tab.id, favicons[0])
    })

    wv.addEventListener('did-start-loading', () => {
      onLoadingChangeRef.current(tab.id, true)
    })

    wv.addEventListener('did-stop-loading', () => {
      onLoadingChangeRef.current(tab.id, false)
      // Sync title from webview in case page-title-updated fired before listener attached
      try {
        const title = wv.getTitle()
        if (title) onTitleChangeRef.current(tab.id, title)
        const url = wv.getURL()
        if (url) onUrlChangeRef.current(tab.id, url)
      } catch { /* webview destroyed */ }
    })

    wv.addEventListener('did-navigate', (e: Event) => {
      const url = (e as CustomEvent & { url: string }).url
      onUrlChangeRef.current(tab.id, url)
      onLoadingChangeRef.current(tab.id, false)
      window.api?.browser.navigated?.(tab.id, url)
    })

    wv.addEventListener('did-navigate-in-page', (e: Event) => {
      const url = (e as CustomEvent & { url: string }).url
      onUrlChangeRef.current(tab.id, url)
      window.api?.browser.navigated?.(tab.id, url)
    })

    // Register webContentsId with main process for companion control
    try {
      const wcId = wv.getWebContentsId()
      if (wcId > 0) window.api?.browser.registerTab?.(tab.id, wcId)
    } catch { /* webview not ready yet */ }
  }, [tab.id])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const onReady = () => {
      attachEvents()
      try {
        const wcId = wv.getWebContentsId()
        if (wcId > 0) window.api?.browser.registerTab?.(tab.id, wcId)
      } catch { /* ignore */ }
    }

    if (wv.isReady?.()) {
      onReady()
    } else {
      wv.addEventListener('dom-ready', onReady, { once: true })
    }

    return () => {
      eventsAttached.current = false
      window.api?.browser.unregisterTab?.(tab.id)
    }
  }, [attachEvents, tab.id])

  if (!tab.url) {
    return visible ? (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <svg className="w-10 h-10 text-[#2a2a2a] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
          </svg>
          <p className="text-xs text-[#3a3a3a]">Enter a URL or search above</p>
        </div>
      </div>
    ) : null
  }

  return (
    <div
      className="absolute inset-0"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <webview
        ref={webviewRef}
        src={tab.url}
        className="w-full h-full"
        allowpopups={'true' as unknown as boolean}
        webpreferences="contextIsolation=yes,nodeIntegration=no,javascript=yes"
        useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
      />
    </div>
  )
}
