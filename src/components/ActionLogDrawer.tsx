import { useGameStore } from '../store/useGameStore'
import { useEffect, useState } from 'react'

interface ActionLogDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ActionLogDrawer({ isOpen, onClose }: ActionLogDrawerProps) {
  const [isRendered, setIsRendered] = useState(isOpen)
  const actionLog = useGameStore((state) => state.game?.actionLog)
  const safeActionLog = actionLog || []

  // Handle animation timing
  useEffect(() => {
    if (isOpen) return
    const timer = setTimeout(() => setIsRendered(false), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!isOpen && !isRendered) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`relative w-full max-h-[80vh] flex flex-col transition-transform duration-300 rounded-t-3xl border-t`}
        style={{
          background: 'var(--surface-primary)',
          borderColor: 'var(--border-subtle)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center p-3 cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--surface-tertiary)' }} />
        </div>

        <div className="px-6 pb-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Action Log</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Close
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-3">
          {safeActionLog.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              No actions recorded yet.
            </div>
          ) : (
            safeActionLog.map((entry) => (
              <div 
                key={entry.id} 
                className="p-3 rounded-xl flex items-start gap-3 border"
                style={{
                  background: 'var(--surface-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {/* Icon based on action type */}
                <div className="w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-[10px] uppercase"
                  style={{
                    background: entry.actionType === 'fold' ? 'rgba(220, 38, 38, 0.15)' :
                               entry.actionType === 'raise' || entry.actionType === 'all-in' ? 'rgba(245, 197, 66, 0.15)' :
                               entry.actionType === 'rebuy' ? 'rgba(34, 197, 94, 0.15)' :
                               'var(--surface-tertiary)',
                    color: entry.actionType === 'fold' ? 'var(--color-crimson)' :
                           entry.actionType === 'raise' || entry.actionType === 'all-in' ? 'var(--color-gold)' :
                           entry.actionType === 'rebuy' ? '#22c55e' :
                           'var(--text-primary)',
                  }}
                >
                  {entry.actionType.substring(0, 3)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.playerId ? `Player ${entry.playerId}` : 'System'} 
                    </span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-2 gap-y-1 items-center" style={{ color: 'var(--text-secondary)' }}>
                    <span className="capitalize">{entry.actionType.replace('-', ' ')}</span>
                    {entry.amount !== undefined && (
                      <span className="font-mono font-medium" style={{ color: 'var(--text-accent)' }}>
                        ${entry.amount}
                      </span>
                    )}
                  </div>
                  
                  {entry.note && (
                    <div className="text-[11px] mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                      {entry.note}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
