import { useState, useEffect, useRef } from 'react'

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  about: string
  color: string
}

interface Props {
  onOpenCompanion: (id: string) => void
  onBrowse: (url: string) => void
}

const QUICK_ACTIONS = [
  { label: 'Research a company', icon: '🔍' },
  { label: 'Summarize a news article', icon: '📰' },
  { label: 'Draft a cold email', icon: '✉️' },
  { label: 'Analyze a competitor', icon: '📊' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage({ onOpenCompanion, onBrowse }: Props) {
  const [companions, setCompanions] = useState<CompanionProfile[]>([])
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api?.companion.list().then(setCompanions).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleSearch(q: string) {
    if (!q.trim()) return
    const isUrl = /^https?:\/\//.test(q) || /^[\w-]+\.\w{2,}(\/.*)?$/.test(q.trim())
    onBrowse(isUrl ? q.trim() : `https://www.google.com/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#050505]">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center px-8 pt-16 pb-10">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 800px 400px at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)',
          }}
        />

        <p className="text-gray-600 text-sm mb-2 tracking-wide">{greeting()}</p>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 text-center">
          What can I help you with?
        </h1>
        <p className="text-gray-600 text-sm text-center mb-8">
          Your AI team is ready — browse smarter, work faster.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-2xl">
          <div
            className="flex items-center gap-3 bg-[#111] border rounded-2xl px-4 py-3.5 transition-all"
            style={{ borderColor: focused ? '#333' : '#1e1e1e' }}
          >
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(search)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search the web or ask your AI team..."
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
              autoFocus
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="text-[10px] text-gray-700 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
              <kbd className="text-[10px] text-gray-700 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono">↵</kbd>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                onClick={() => handleSearch(q.label)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 bg-[#0e0e0e] hover:bg-[#141414] border border-[#1a1a1a] hover:border-[#282828] rounded-full px-3 py-1.5 transition-all"
              >
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Companions grid */}
      <div className="flex-1 px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Your AI Team</h2>
            <span className="text-xs text-gray-700">{companions.length} companions</span>
          </div>

          {companions.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-[#0e0e0e] border border-[#181818] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {companions.map((c) => (
                <CompanionCard key={c.id} companion={c} onClick={() => onOpenCompanion(c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-800 pb-6">
        detiq · AI-first browser · powered by Claude &amp; GPT
      </p>
    </div>
  )
}

function CompanionCard({ companion, onClick }: { companion: CompanionProfile; onClick: () => void }) {
  const initials = companion.name.split(' ').map((w) => w[0]).join('').slice(0, 2)

  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl p-4 bg-[#0e0e0e] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-200 overflow-hidden"
    >
      {/* Subtle color glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${companion.color}12 0%, transparent 60%)` }}
      />

      <div className="flex items-start gap-3 relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: companion.color }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-sm font-semibold text-gray-100 truncate">{companion.name}</span>
            <svg
              className="w-3 h-3 text-gray-700 group-hover:text-gray-500 shrink-0 transition-colors transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">{companion.summary}</p>
        </div>
      </div>

      <div className="mt-3 relative">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize inline-block"
          style={{ backgroundColor: `${companion.color}18`, color: companion.color }}
        >
          {companion.role}
        </span>
      </div>
    </button>
  )
}
