import { useEffect, useRef, useCallback } from 'react'
import { Tab } from '../layout/BrowserLayout'

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
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const eventsAttached = useRef(false)

  const attachEvents = useCallback(() => {
    const wv = webviewRef.current
    if (!wv || eventsAttached.current) return
    eventsAttached.current = true

    wv.addEventListener('page-title-updated', (e: Event) => {
      onTitleChange(tab.id, (e as CustomEvent & { title: string }).title)
    })

    wv.addEventListener('page-favicon-updated', (e: Event) => {
      const favicons = (e as CustomEvent & { favicons: string[] }).favicons
      if (favicons?.[0]) onFaviconChange(tab.id, favicons[0])
    })

    wv.addEventListener('did-start-loading', () => {
      onLoadingChange(tab.id, true)
    })

    wv.addEventListener('did-stop-loading', () => {
      onLoadingChange(tab.id, false)
    })

    wv.addEventListener('did-navigate', (e: Event) => {
      const url = (e as CustomEvent & { url: string }).url
      onUrlChange(tab.id, url)
      onLoadingChange(tab.id, false)
    })

    wv.addEventListener('did-navigate-in-page', (e: Event) => {
      const url = (e as CustomEvent & { url: string }).url
      onUrlChange(tab.id, url)
    })

    // Register this webview's webContentsId with main process for companion control
    try {
      const wcId = wv.getWebContentsId()
      if (wcId > 0) {
        window.api?.browser.registerTab?.(tab.id, wcId)
      }
    } catch {
      // webview not ready yet, will retry
    }
  }, [tab.id])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    // Wait for webview to be ready
    const onReady = () => {
      attachEvents()
      // Re-try registration after ready
      try {
        const wcId = wv.getWebContentsId()
        if (wcId > 0) window.api?.browser.registerTab?.(tab.id, wcId)
      } catch {}
    }

    if ((wv as unknown as { isReady?: () => boolean }).isReady?.()) {
      onReady()
    } else {
      wv.addEventListener('dom-ready', onReady, { once: true })
    }

    return () => {
      window.api?.browser.unregisterTab?.(tab.id)
    }
  }, [attachEvents, tab.id])

  // Empty tab — show blank state only when visible
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
