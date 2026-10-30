import { KeyboardEvent, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onRefresh: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  companionName?: string
  companionColor?: string
}

export default function AddressBar({
  value, onChange, onNavigate, onBack, onForward, onRefresh,
  onToggleSidebar, sidebarOpen, companionName, companionColor
}: Props) {
  const [focused, setFocused] = useState(false)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onNavigate(value)
    if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
  }

  const isSecure = value.startsWith('https://')

  return (
    <div className="flex items-center h-11 px-3 gap-2 bg-[#0d0d0d] border-b border-[#191919] shrink-0">
      {/* Nav controls */}
      <div className="flex gap-0.5 shrink-0">
        <NavBtn onClick={onBack} title="Back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </NavBtn>
        <NavBtn onClick={onForward} title="Forward">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </NavBtn>
        <NavBtn onClick={onRefresh} title="Refresh">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </NavBtn>
      </div>

      {/* Address input */}
      <div className={`flex-1 flex items-center gap-2 bg-[#141414] rounded-xl px-3 h-7 border transition-all ${
        focused ? 'border-[#2a2a2a]' : 'border-transparent'
      }`}>
        {/* Lock icon */}
        {value && !focused && (
          <svg
            className={`w-3 h-3 shrink-0 ${isSecure ? 'text-green-600' : 'text-gray-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => { setFocused(true); e.target.select() }}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-xs text-gray-300 outline-none placeholder-gray-600 min-w-0"
          placeholder="Search or enter URL..."
          spellCheck={false}
        />
      </div>

      {/* AI companion toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Close AI panel' : 'Open AI panel'}
        className={`shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-xl text-xs font-medium transition-all ${
          sidebarOpen
            ? 'text-white'
            : 'bg-[#141414] text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'
        }`}
        style={sidebarOpen ? { backgroundColor: companionColor ?? '#6366f1' } : {}}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>{companionName ?? 'AI'}</span>
      </button>
    </div>
  )
}

function NavBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-[#141414] transition-all"
    >
      {children}
    </button>
  )
}
