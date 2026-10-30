import { useState, useEffect, useRef, useCallback } from 'react'

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  color: string
}

interface Tab {
  id: string
  url: string
  title: string
  favicon?: string
}

interface Props {
  companions: CompanionProfile[]
  tabs: Tab[]
  onNavigate: (url: string) => void
  onOpenCompanion: (id: string) => void
  onSelectTab: (id: string) => void
  onClose: () => void
}

type ResultKind = 'companion' | 'tab' | 'action' | 'search'

interface Result {
  id: string
  kind: ResultKind
  label: string
  sublabel?: string
  color?: string
  initials?: string
  favicon?: string
  action: () => void
}

export default function CommandPalette({ companions, tabs, onNavigate, onOpenCompanion, onSelectTab, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape or click-outside
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = useCallback((): Result[] => {
    const q = query.trim().toLowerCase()
    const list: Result[] = []

    // Web navigate if looks like URL
    if (q && (/^https?:\/\//.test(q) || /^[\w-]+\.\w{2,}/.test(q))) {
      const url = /^https?:\/\//.test(q) ? q : `https://${q}`
      list.push({
        id: 'nav',
        kind: 'action',
        label: `Go to ${q}`,
        sublabel: 'Navigate',
        action: () => { onNavigate(url); onClose() }
      })
    }

    // Web search
    if (q) {
      list.push({
        id: 'search',
        kind: 'search',
        label: `Search for "${q}"`,
        sublabel: 'Google',
        action: () => { onNavigate(`https://www.google.com/search?q=${encodeURIComponent(q)}`); onClose() }
      })
    }

    // Companions
    companions
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
      .forEach((c) => {
        const initials = c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
        list.push({
          id: `companion-${c.id}`,
          kind: 'companion',
          label: c.name,
          sublabel: c.role,
          color: c.color,
          initials,
          action: () => { onOpenCompanion(c.id); onClose() }
        })
      })

    // Open tabs
    tabs
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q))
      .forEach((t) => {
        list.push({
          id: `tab-${t.id}`,
          kind: 'tab',
          label: t.title || t.url,
          sublabel: t.url,
          favicon: t.favicon,
          action: () => { onSelectTab(t.id); onClose() }
        })
      })

    // Quick actions when no input
    if (!q) {
      const QUICK = [
        { id: 'sum', label: 'Summarize this page', sublabel: 'Ask companion' },
        { id: 'ext', label: 'Extract key data', sublabel: 'Ask companion' },
        { id: 'res', label: 'Research this company', sublabel: 'Ask companion' },
      ]
      QUICK.forEach((a) => {
        list.push({
          id: a.id,
          kind: 'action',
          label: a.label,
          sublabel: a.sublabel,
          action: () => { onNavigate(`https://www.google.com/search?q=${encodeURIComponent(a.label)}`); onClose() }
        })
      })
    }

    return list.slice(0, 10)
  }, [query, companions, tabs, onNavigate, onOpenCompanion, onSelectTab, onClose])

  const items = results()

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      items[activeIdx]?.action()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const kindIcon = (kind: ResultKind) => {
    if (kind === 'search') return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
    if (kind === 'action') return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3-3 3m-6 0h9" />
      </svg>
    )
    if (kind === 'tab') return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.8} />
        <path d="M3 9h18" strokeWidth={1.8} />
      </svg>
    )
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0e0e0e', borderColor: '#252525' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: '#1c1c1c' }}>
          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Navigate, search, or open a companion..."
            className="flex-1 bg-transparent text-[13px] text-gray-200 placeholder-gray-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-700 hover:text-gray-400 transition-colors shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="text-[10px] text-gray-700 border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono shrink-0">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <p className="text-center text-xs text-gray-700 py-8">No results</p>
          ) : (
            items.map((item, i) => (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setActiveIdx(i)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors text-left"
                style={{ backgroundColor: i === activeIdx ? '#161616' : 'transparent' }}
              >
                {/* Icon / Avatar */}
                {item.kind === 'companion' ? (
                  <div
                    className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}bb 100%)` }}
                  >
                    {item.initials}
                  </div>
                ) : item.favicon ? (
                  <img src={item.favicon} className="w-4 h-4 rounded shrink-0" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-[#1a1a1a] text-gray-600">
                    {kindIcon(item.kind)}
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-200 truncate">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-[10px] text-gray-600 truncate">{item.sublabel}</p>
                  )}
                </div>

                {/* Kind badge */}
                <span className="text-[9px] text-gray-700 shrink-0 capitalize">{item.kind}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t" style={{ borderColor: '#1c1c1c' }}>
          <Hint keys={['↑', '↓']} label="navigate" />
          <Hint keys={['↵']} label="open" />
          <Hint keys={['esc']} label="close" />
        </div>
      </div>
    </div>
  )
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="text-[9px] text-gray-700 border border-[#2a2a2a] rounded px-1 py-0.5 font-mono">{k}</kbd>
      ))}
      <span className="text-[10px] text-gray-700 ml-0.5">{label}</span>
    </div>
  )
}
