import { Tab } from './BrowserLayout'

interface CompanionProfile {
  id: string
  name: string
  color: string
}

interface Props {
  mode: string
  tabs: Tab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onNewTab: () => void
  onHome: () => void
  companions: CompanionProfile[]
  onOpenCompanion: (id: string) => void
}

export default function LeftNav({
  mode, tabs, activeTabId, onTabSelect, onTabClose, onNewTab, onHome, companions, onOpenCompanion
}: Props) {
  const isBrowser = mode === 'browser'
  const isHome = mode === 'home'
  const activeCompanionId = mode.startsWith('companion:') ? mode.slice(10) : null

  return (
    <div className="w-52 flex flex-col bg-[#080808] border-r border-[#171717] shrink-0 overflow-hidden select-none">
      {/* Traffic light drag region — macOS buttons sit at x:16,y:16 within this 208px column */}
      <div className="h-12 shrink-0 drag" />

      <div className="flex flex-col flex-1 overflow-hidden px-2 pb-3 no-drag">
        {/* Home */}
        <NavRow label="Home" active={isHome} onClick={onHome} icon={<HomeIcon />} />

        {/* Tabs — no section label, context is obvious */}
        {tabs.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto" style={{ maxHeight: '38vh' }}>
            {tabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId && isBrowser}
                onSelect={() => onTabSelect(tab.id)}
                onClose={() => onTabClose(tab.id)}
              />
            ))}
          </div>
        )}

        <button
          onClick={onNewTab}
          className="mt-1 flex items-center gap-2 h-7 px-2 rounded-lg text-[11px] text-gray-700 hover:text-gray-400 hover:bg-[#111] transition-all w-full"
        >
          <PlusIcon />
          <span>New Tab</span>
        </button>

        <div className="flex-1" />

        {/* Companions */}
        {companions.length > 0 && (
          <>
            <p className="text-[9px] text-gray-700 uppercase tracking-[0.12em] px-2 pt-3 pb-1">Companions</p>
            <div className="flex flex-col gap-0.5 mb-2">
              {companions.map((c) => {
                const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)
                const active = activeCompanionId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => onOpenCompanion(c.id)}
                    className="flex items-center gap-2 h-8 px-2 rounded-lg text-[11px] transition-all w-full text-left"
                    style={{
                      backgroundColor: active ? `${c.color}18` : 'transparent',
                      color: active ? '#f3f4f6' : '#6b7280',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111111'
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${c.color} 0%, ${c.color}bb 100%)`,
                        boxShadow: active ? `0 2px 8px ${c.color}40` : 'none',
                      }}
                    >
                      {initials}
                    </div>
                    <span className="truncate flex-1">{c.name}</span>
                    {active && <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: c.color }} />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Settings */}
        <NavRow label="Settings" active={false} onClick={() => {}} icon={<SettingsIcon />} />
      </div>
    </div>
  )
}

function NavRow({
  label, active, onClick, icon
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 h-8 px-2 rounded-lg text-[12px] transition-all w-full ${
        active
          ? 'bg-[#1c1c1c] text-gray-100'
          : 'text-gray-600 hover:text-gray-300 hover:bg-[#111]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function TabRow({
  tab, active, onSelect, onClose
}: {
  tab: Tab
  active: boolean
  onSelect: () => void
  onClose: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 h-8 px-2 rounded-lg cursor-pointer transition-all ${
        active
          ? 'bg-[#1c1c1c] text-gray-100'
          : 'text-gray-600 hover:bg-[#111] hover:text-gray-300'
      }`}
    >
      <span className="shrink-0 flex items-center justify-center w-3">
        {tab.isLoading ? (
          <div className="w-3 h-3 rounded-full border border-t-transparent border-current animate-spin" />
        ) : tab.favicon ? (
          <img
            src={tab.favicon}
            className="w-3 h-3 rounded-sm"
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <GlobeIcon />
        )}
      </span>
      <span className="text-[11px] truncate flex-1">{tab.title || 'New Tab'}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a2a2a] shrink-0 transition-opacity"
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
      <path d="M3 12h18M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" strokeWidth={1.5} />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}
