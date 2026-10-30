import { useState, useEffect, useCallback, useRef } from 'react'
import LeftNav from './LeftNav'
import AddressBar from '../browser/AddressBar'
import WebViewArea from '../browser/WebViewArea'
import CompanionSidebar from '../companion/CompanionSidebar'
import CompanionWorkspace from '../companion/CompanionWorkspace'
import HomePage from '../home/HomePage'
import CommandPalette from '../ui/CommandPalette'

export interface Tab {
  id: string
  url: string
  title: string
  favicon?: string
  isLoading: boolean
}

type AppMode = 'home' | 'browser' | `companion:${string}`

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  about: string
  color: string
}

function makeTab(url = ''): Tab {
  return { id: `tab-${crypto.randomUUID().slice(0, 8)}`, url, title: url ? 'Loading...' : 'New Tab', isLoading: !!url }
}

export default function BrowserLayout() {
  const [mode, setMode] = useState<AppMode>('home')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState('')
  const [addressValue, setAddressValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [companions, setCompanions] = useState<CompanionProfile[]>([])
  const [activeSidebarCompanionId, setActiveSidebarCompanionId] = useState('sales-sam')
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Only open palette in browser/companion mode; home page has its own search focus
        if (mode !== 'home') setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode])

  useEffect(() => {
    window.api?.companion.list().then((list) => {
      setCompanions(list)
    }).catch(() => {})
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeCompanionId = mode.startsWith('companion:') ? mode.slice(10) : null
  const activeCompanion = activeCompanionId ? companions.find((c) => c.id === activeCompanionId) : null
  const sidebarCompanion = companions.find((c) => c.id === activeSidebarCompanionId) ?? companions[0]

  useEffect(() => {
    if (mode === 'browser' && activeTab) {
      setAddressValue(activeTab.url)
    }
  }, [activeTab?.url, mode])

  function navigate(rawUrl: string) {
    if (!rawUrl.trim()) return
    const url = rawUrl.startsWith('http') || rawUrl.startsWith('about:') ? rawUrl : `https://${rawUrl}`

    if (mode !== 'browser') {
      // Create first tab if none exist
      const tab = makeTab(url)
      setTabs([tab])
      setActiveTabId(tab.id)
      setAddressValue(url)
      setMode('browser')
      return
    }

    if (!activeTabId || tabs.length === 0) {
      const tab = makeTab(url)
      setTabs([tab])
      setActiveTabId(tab.id)
      setAddressValue(url)
      return
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, url, title: 'Loading...', isLoading: true } : t))
    )
    setAddressValue(url)
  }

  function addTab(url?: string) {
    const tab = makeTab(url)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setAddressValue(url ?? '')
    setMode('browser')
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        setMode('home')
        setActiveTabId('')
        setAddressValue('')
        return []
      }
      if (activeTabId === id) {
        const idx = prev.findIndex((t) => t.id === id)
        const fallback = next[Math.max(0, idx - 1)]
        setActiveTabId(fallback.id)
        setAddressValue(fallback.url)
      }
      return next
    })
  }

  function selectTab(id: string) {
    setActiveTabId(id)
    const tab = tabs.find((t) => t.id === id)
    if (tab) setAddressValue(tab.url)
    setMode('browser')
  }

  function openCompanion(id: string) {
    setMode(`companion:${id}` as AppMode)
    setSidebarOpen(false)
  }

  function goHome() {
    setMode('home')
    setSidebarOpen(false)
  }

  function browseWithCompanion(url: string) {
    navigate(url)
    setMode('browser')
    setSidebarOpen(true)
  }

  const handleTitleChange = useCallback((tabId: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title } : t)))
  }, [])

  const handleFaviconChange = useCallback((tabId: string, favicon: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, favicon } : t)))
  }, [])

  const handleLoadingChange = useCallback((tabId: string, loading: boolean) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isLoading: loading } : t)))
  }, [])

  // Use a ref so the callback stable reference never captures stale activeTabId
  const activeTabIdRef = useRef(activeTabId)
  activeTabIdRef.current = activeTabId

  const handleUrlChange = useCallback((tabId: string, url: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, url } : t)))
    if (tabId === activeTabIdRef.current) setAddressValue(url)
  }, [])

  const isBrowser = mode === 'browser'
  const isHome = mode === 'home'
  const isCompanion = mode.startsWith('companion:')


  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Arc-style sidebar — holds tabs + companions, provides traffic light clearance */}
      <LeftNav
        mode={mode}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={selectTab}
        onTabClose={closeTab}
        onNewTab={() => addTab()}
        onHome={goHome}
        companions={companions}
        onOpenCompanion={openCompanion}
      />

      {/* Main area — traffic lights live in sidebar column, no spacer needed here */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Browser chrome — only in browser mode */}
        {isBrowser && (
          <AddressBar
              value={addressValue}
              onChange={setAddressValue}
              onNavigate={navigate}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
              sidebarOpen={sidebarOpen}
              companionName={sidebarCompanion?.name?.split(' ')[1] ?? 'AI'}
              companionColor={sidebarCompanion?.color}
              onBack={() => window.api?.browser.back(activeTabId)}
              onForward={() => window.api?.browser.forward(activeTabId)}
              onRefresh={() => window.api?.browser.refresh(activeTabId)}
            />
        )}

        {/* Content row */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Primary view */}
          <div className="flex-1 min-w-0 relative overflow-hidden">
            {isHome && (
              <HomePage
                onOpenCompanion={openCompanion}
                onBrowse={(url) => addTab(url)}
              />
            )}

            {isCompanion && activeCompanion && (
              <CompanionWorkspace
                companion={activeCompanion}
                tabId={activeTabId}
                onBack={goHome}
                onBrowseWithCompanion={browseWithCompanion}
              />
            )}

            {/* Keep all webviews mounted so pages survive mode switches */}
            {tabs.map((tab) => (
              <WebViewArea
                key={tab.id}
                tab={tab}
                visible={isBrowser && tab.id === activeTabId}
                onTitleChange={handleTitleChange}
                onFaviconChange={handleFaviconChange}
                onLoadingChange={handleLoadingChange}
                onUrlChange={handleUrlChange}
              />
            ))}

            {/* Empty browser state */}
            {isBrowser && tabs.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-700">
                <p className="text-sm">Type a URL in the address bar above</p>
              </div>
            )}
          </div>

          {/* Companion panel — right side when browsing */}
          {isBrowser && sidebarOpen && sidebarCompanion && (
            <CompanionSidebar
              tabId={activeTabId}
              companionId={activeSidebarCompanionId}
              onCompanionChange={setActiveSidebarCompanionId}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>

      {/* ⌘K Command palette — fixed overlay, inside root div */}
      {cmdOpen && (
        <CommandPalette
          companions={companions}
          tabs={tabs}
          onNavigate={navigate}
          onOpenCompanion={openCompanion}
          onSelectTab={selectTab}
          onClose={() => setCmdOpen(false)}
        />
      )}
    </div>
  )
}
