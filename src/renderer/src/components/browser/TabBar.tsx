import { Tab } from '../layout/BrowserLayout'

interface Props {
  tabs: Tab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onNewTab: () => void
}

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab }: Props) {
  return (
    <div className="flex items-center h-9 bg-[#0d0d0d] px-2 gap-1 overflow-x-auto shrink-0 border-b border-[#191919]">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg cursor-pointer shrink-0 max-w-[180px] min-w-[80px] group transition-all ${
            tab.id === activeTabId
              ? 'bg-[#1a1a1a] text-gray-200'
              : 'text-gray-600 hover:bg-[#141414] hover:text-gray-400'
          }`}
        >
          {tab.isLoading ? (
            <div className="w-3 h-3 rounded-full border border-t-transparent border-gray-500 animate-spin shrink-0" />
          ) : tab.favicon ? (
            <img src={tab.favicon} className="w-3 h-3 shrink-0 rounded-sm" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#333] shrink-0" />
          )}
          <span className="text-[11px] truncate flex-1 leading-none">{tab.title || 'New Tab'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTabClose(tab.id)
            }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a2a2a] shrink-0 transition-all"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        title="New tab"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-[#141414] shrink-0 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
