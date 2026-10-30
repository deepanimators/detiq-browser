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
  { label: 'Summarize latest news', icon: '📰' },
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
    <div className="h-full flex flex-col overflow-y-auto bg-[#050505] relative">
      {/* Background radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 900px 500px at 60% -10%, rgba(99,102,241,0.07) 0%, transparent 65%)' }}
      />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center px-8 pt-14 pb-8 shrink-0">
        <p className="text-[13px] text-gray-600 mb-2 tracking-wide">{greeting()}</p>
        <h1 className="text-[36px] font-bold text-white tracking-tight mb-1.5 text-center leading-tight">
          What can I help you with?
        </h1>
        <p className="text-[13px] text-gray-600 text-center mb-8">
          Your AI team is ready — browse smarter, work faster.
        </p>

        {/* Search */}
        <div className="w-full max-w-xl">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all border"
            style={{
              backgroundColor: '#0f0f0f',
              borderColor: focused ? '#2e2e2e' : '#1a1a1a',
              boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none'
            }}
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
              className="flex-1 bg-transparent text-[13px] text-gray-200 placeholder-gray-600 outline-none"
              autoFocus
            />
            <kbd className="text-[10px] text-gray-700 border border-[#262626] rounded px-1.5 py-0.5 font-mono shrink-0">⌘K</kbd>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                onClick={() => handleSearch(q.label)}
                className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-200 bg-[#0e0e0e] hover:bg-[#141414] border border-[#1c1c1c] hover:border-[#2a2a2a] rounded-full px-3 py-1.5 transition-all"
              >
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Team grid */}
      <div className="flex-1 px-8 pb-10 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.12em]">Your AI Team</p>
            <p className="text-[10px] text-gray-700">{companions.length} companions</p>
          </div>

          {companions.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[104px] rounded-2xl bg-[#0e0e0e] border border-[#181818] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {companions.map((c, i) => (
                <CompanionCard key={c.id} companion={c} index={i} onClick={() => onOpenCompanion(c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-800 pb-5 shrink-0">
        detiq · AI-first browser · Claude &amp; GPT
      </p>
    </div>
  )
}

function CompanionCard({
  companion, index, onClick
}: {
  companion: CompanionProfile
  index: number
  onClick: () => void
}) {
  const initials = companion.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative text-left rounded-2xl p-4 border transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: hovered ? '#101010' : '#0b0b0b',
        borderColor: hovered ? '#282828' : '#181818',
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Color glow on hover */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(ellipse at 0% 0%, ${companion.color}16 0%, transparent 55%)`,
        }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-opacity duration-200"
        style={{ backgroundColor: companion.color, opacity: hovered ? 0.8 : 0.3 }}
      />

      <div className="flex items-start gap-3 relative">
        {/* Avatar with gradient */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${companion.color} 0%, ${companion.color}99 100%)`,
            boxShadow: hovered ? `0 4px 12px ${companion.color}40` : 'none',
          }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-100 truncate">{companion.name}</span>
            <svg
              className="w-3 h-3 text-gray-700 group-hover:text-gray-500 shrink-0 ml-auto transition-all group-hover:translate-x-0.5"
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

      <div className="mt-2.5 relative">
        <span
          className="text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize tracking-wide"
          style={{ backgroundColor: `${companion.color}1a`, color: companion.color }}
        >
          {companion.role}
        </span>
      </div>
    </button>
  )
}
