import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'action'
  content: string
}

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  color: string
}

interface Props {
  tabId: string
  companionId: string
  onCompanionChange: (id: string) => void
  onClose: () => void
}

const SUGGESTIONS = [
  'Summarize this page',
  'Extract key data',
  'Research this company',
  'Find contact info'
]

export default function CompanionSidebar({ tabId, companionId, onCompanionChange, onClose }: Props) {
  const [companions, setCompanions] = useState<CompanionProfile[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api?.companion.list().then(setCompanions).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset messages when companion changes
  useEffect(() => {
    setMessages([])
    setRunning(false)
    setSessionId(null)
  }, [companionId])

  useEffect(() => {
    const cleanup = () => {
      window.api?.companion.removeListeners?.()
    }
    cleanup()

    window.api?.companion.onAction((action: unknown) => {
      const a = action as Record<string, unknown>
      let label = a['type'] as string

      if (a['type'] === 'navigate') {
        label = `Navigating to ${a['url'] ?? '...'}`
      } else if (a['type'] === 'click') {
        label = `Clicking: ${a['description'] ?? 'element'}`
      } else if (a['type'] === 'type') {
        label = 'Typing into field'
      } else if (a['type'] === 'extract') {
        label = 'Extracting data...'
      } else if (a['type'] === 'scroll') {
        label = `Scrolling ${a['direction'] ?? ''}`
      } else if (a['type'] === 'approval_request') {
        label = `Approval needed: ${a['action_description'] ?? ''}`
      }

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'action', content: label }])
    })

    window.api?.companion.onComplete((result: unknown) => {
      const r = result as { status: string; summary?: string; error?: string }
      setRunning(false)
      setSessionId(null)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: r.status === 'error'
            ? `Error: ${r.error ?? 'unknown'}`
            : r.summary ?? `Done (${r.status})`
        }
      ])
    })

    return cleanup
  }, [companionId])

  const selected = companions.find((c) => c.id === companionId) ?? companions[0]

  async function send() {
    if (!input.trim() || running) return
    const text = input.trim()
    setInput('')
    setRunning(true)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    try {
      const id = await window.api?.companion.run(text, tabId, companionId)
      setSessionId(id)
    } catch (err) {
      setRunning(false)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `Failed: ${err}` }
      ])
    }
  }

  async function stop() {
    if (sessionId) {
      await window.api?.companion.stop(sessionId)
      setRunning(false)
      setSessionId(null)
    }
  }

  return (
    <div className="w-72 flex flex-col border-l border-[#191919] bg-[#0d0d0d] shrink-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#191919]">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
        >
          {selected && (
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: selected.color }}
            >
              {selected.name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-medium text-gray-200 truncate">{selected?.name ?? 'Companion'}</span>
          <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-300 hover:bg-[#1a1a1a] transition-all shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Companion picker dropdown */}
      {showPicker && (
        <div className="absolute top-10 left-0 right-0 z-50 bg-[#141414] border border-[#252525] shadow-2xl max-h-64 overflow-y-auto rounded-b-xl">
          {companions.map((c) => (
            <button
              key={c.id}
              onClick={() => { onCompanionChange(c.id); setShowPicker(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors text-left ${c.id === companionId ? 'bg-[#1a1a1a]' : ''}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: c.color }}
              >
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-200">{c.name}</div>
                <div className="text-[10px] text-gray-600 truncate">{c.summary}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="space-y-1.5 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="w-full text-left px-3 py-2 rounded-xl bg-[#111] hover:bg-[#161616] border border-[#1e1e1e] hover:border-[#2a2a2a] text-xs text-gray-500 hover:text-gray-300 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'action' ? (
              <div className="flex items-center gap-2 py-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: selected?.color ?? '#6366f1', opacity: 0.7 }}
                />
                <span className="text-[11px] text-gray-600 leading-snug">{msg.content}</span>
              </div>
            ) : msg.role === 'user' ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[90%] px-3 py-2 rounded-xl rounded-br-sm text-xs text-white"
                  style={{ backgroundColor: selected?.color ?? '#6366f1' }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {selected && (
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: selected.color }}
                  >
                    {selected.name.charAt(0)}
                  </div>
                )}
                <div className="bg-[#1a1a1a] rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-300 leading-relaxed max-w-[88%] whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {running && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full animate-bounce"
                  style={{ backgroundColor: selected?.color ?? '#6366f1', animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <span className="text-[11px] text-gray-600">Working...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-[#191919]">
        <div className="flex gap-2 bg-[#141414] border border-[#222] rounded-xl px-3 py-2 focus-within:border-[#2a2a2a] transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={`Ask ${selected?.name?.split(' ')[1] ?? 'companion'}...`}
            disabled={running}
            className="flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder-gray-600 min-w-0"
          />
          {running ? (
            <button onClick={stop} className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="shrink-0 transition-opacity disabled:opacity-30"
              style={{ color: selected?.color ?? '#6366f1' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
