import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'action'
  content: string
  timestamp: Date
}

interface CompanionProfile {
  id: string
  name: string
  role: string
  summary: string
  about: string
  color: string
}

interface Props {
  companion: CompanionProfile
  tabId: string
  onBack: () => void
  onBrowseWithCompanion: (url: string) => void
}

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  'sales': ['Find 10 companies similar to Stripe', 'Draft an outreach email for a SaaS CTO', 'Research this prospect before my call'],
  'research': ['Research the AI browser market', 'Compare pricing of top 5 CRMs', 'Summarize recent news about OpenAI'],
  'developer': ['Test the checkout flow on our app', 'Find all 404 errors on this page', 'Review the GitHub PR'],
  'operations': ['Draft my weekly update', 'Summarize my unread emails', 'What meetings do I have today?'],
  'marketing': ['Write 5 LinkedIn posts in my voice', 'Audit competitor landing pages', 'Plan a launch campaign for next week'],
  'support': ['Triage my support inbox', 'Draft replies for the top 5 tickets', 'Route this bug to Linear'],
  'executive': ['Brief me on today\'s schedule', 'Draft a reply to this email', 'Clear my action items'],
  'recruiting': ['Find senior React engineers in Berlin', 'Score these 3 candidates', 'Draft an outreach for this role'],
  'finance': ['Summarize last month\'s expenses', 'Send invoice to Acme Corp', 'Flag overdue payments']
}

export default function CompanionWorkspace({ companion, tabId, onBack, onBrowseWithCompanion }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = ROLE_SUGGESTIONS[companion.role] ?? ROLE_SUGGESTIONS['research']

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    window.api?.companion.removeListeners?.()

    window.api?.companion.onAction((action: unknown) => {
      const a = action as { type: string; description?: string; url?: string }
      const label =
        a.type === 'navigate'
          ? `Navigating to ${a.url}`
          : a.type === 'click'
            ? `Clicking: ${a.description ?? 'element'}`
            : a.type === 'type'
              ? `Typing into field`
              : a.type === 'extract'
                ? 'Extracting data...'
                : a.description ?? a.type

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'action', content: label, timestamp: new Date() }
      ])

      if (a.type === 'navigate' && a.url) {
        onBrowseWithCompanion(a.url as string)
      }
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
          content: r.status === 'error' ? `Something went wrong: ${r.error}` : r.summary ?? `Done (${r.status})`,
          timestamp: new Date()
        }
      ])
    })

    return () => {
      window.api?.companion.removeListeners?.()
    }
  }, [companion.id])

  async function send() {
    if (!input.trim() || running) return
    const text = input.trim()
    setInput('')
    setRunning(true)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() }
    ])
    try {
      const id = await window.api?.companion.run(text, tabId, companion.id)
      setSessionId(id)
    } catch (err) {
      setRunning(false)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `Failed to start: ${err}`, timestamp: new Date() }
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
    <div className="flex flex-col h-full bg-[#0a0a0a] animate-slide-in-right">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b border-[#191919] shrink-0"
        style={{ paddingTop: '48px' }}
      >
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-[#141414]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
          style={{ backgroundColor: companion.color }}
        >
          {companion.name.charAt(0)}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{companion.name}</h2>
          <p className="text-xs text-gray-500 capitalize">{companion.role}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {running && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${i*120}ms` }}
                  />
                ))}
              </div>
              Working
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {/* About message */}
        {messages.length === 0 && (
          <div className="animate-fade-in">
            <div className="flex items-start gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: companion.color }}
              >
                {companion.name.charAt(0)}
              </div>
              <div className="bg-[#141414] rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                <p className="text-sm text-gray-300 leading-relaxed">{companion.about}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Suggestions</p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="flex items-center gap-2 w-full text-left text-xs text-gray-400 hover:text-gray-200 bg-[#111] hover:bg-[#161616] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-4 py-2.5 transition-all"
                >
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ backgroundColor: companion.color }}
                  />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in">
            {msg.role === 'action' ? (
              <div className="flex items-center gap-2 py-1">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ backgroundColor: companion.color }}
                />
                <span className="text-xs text-gray-600">{msg.content}</span>
              </div>
            ) : msg.role === 'user' ? (
              <div className="flex justify-end">
                <div
                  className="max-w-sm rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white"
                  style={{ backgroundColor: companion.color }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: companion.color }}
                >
                  {companion.name.charAt(0)}
                </div>
                <div className="bg-[#141414] rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6 shrink-0">
        <div className="flex items-end gap-3 bg-[#141414] border border-[#222] rounded-2xl p-3 focus-within:border-[#333] transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={`Ask ${companion.name}...`}
            disabled={running}
            className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600 resize-none"
          />
          {running ? (
            <button
              onClick={stop}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#1e1e1e] text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-30"
              style={{ backgroundColor: companion.color }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-2">
          {companion.name} uses the browser to complete tasks on your behalf
        </p>
      </div>
    </div>
  )
}
