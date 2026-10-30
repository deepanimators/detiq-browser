import { useState, useEffect } from 'react'

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

const QUICK_SEARCHES = [
  'Research a company',
  'Summarize latest AI news',
  'Find open roles at Stripe',
  'Draft a cold email'
]

export default function HomePage({ onOpenCompanion, onBrowse }: Props) {
  const [companions, setCompanions] = useState<CompanionProfile[]>([])
  const [search, setSearch] = useState('')
  const [hour] = useState(() => new Date().getHours())

  useEffect(() => {
    window.api?.companion.list().then(setCompanions).catch(() => {})
  }, [])

  const greeting =
    hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function handleSearch(q: string) {
    if (!q.trim()) return
    const isUrl = /^https?:\/\//.test(q) || /^[\w-]+\.\w{2,}(\/.*)?\s*$/.test(q)
    onBrowse(isUrl ? q : `https://www.google.com/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex-1 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Greeting */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold text-white tracking-tight">{greeting}</h1>
          <p className="text-gray-500 mt-1 text-sm">Your AI team is ready. What should we tackle?</p>
        </div>

        {/* Search */}
        <div className="mb-10 animate-fade-in stagger-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(search)}
              placeholder="Search the web or enter a URL..."
              className="w-full bg-[#141414] border border-[#252525] rounded-2xl pl-11 pr-12 py-3.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-[#353535] transition-colors"
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              <kbd className="text-[10px] text-gray-700 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5">↵</kbd>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {QUICK_SEARCHES.map((q) => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="text-xs text-gray-600 hover:text-gray-300 bg-[#111] hover:bg-[#171717] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-full px-3 py-1.5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* AI team */}
        <div className="animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Your AI team</h2>
            <span className="text-xs text-gray-700">{companions.length} companions</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {companions.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onOpenCompanion(c.id)}
                className={`group text-left rounded-2xl p-4 bg-[#111] border border-[#1c1c1c] hover:border-[#282828] hover:bg-[#141414] transition-all duration-200 animate-fade-in`}
                style={{ animationDelay: `${0.1 + i * 0.04}s` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-100 truncate">{c.name}</span>
                      <svg className="w-3 h-3 text-gray-700 group-hover:text-gray-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{c.summary}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: `${c.color}18`, color: c.color }}>
                    {c.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-800 mt-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          detiq · powered by OpenAI &amp; Anthropic
        </p>
      </div>
    </div>
  )
}
