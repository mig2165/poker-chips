import { useNavigate } from 'react-router-dom'

export default function LobbyPage() {
  const navigate = useNavigate()

  function handleNewGame() {
    navigate('/settings')
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="pt-14 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{
            background: 'linear-gradient(135deg, var(--color-felt), var(--color-felt-light))',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="var(--color-gold)" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="10" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="16" cy="16" r="5" fill="var(--color-gold)" opacity="0.3" />
            <text x="16" y="20" textAnchor="middle" fill="var(--color-gold)" fontSize="12" fontWeight="bold">♠</text>
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="text-gradient">Poker Chips</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Virtual chip tracker for live home games
        </p>
      </header>

      {/* Quick Actions */}
      <section className="flex-1 px-5 pb-6 flex flex-col gap-4">
        {/* New Game Card */}
        <button
          id="btn-new-game"
          onClick={handleNewGame}
          className="w-full rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer border"
          style={{
            background: 'linear-gradient(135deg, var(--color-felt-dark), var(--color-felt))',
            borderColor: 'var(--border-active)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ background: 'rgba(245, 197, 66, 0.15)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                New Game
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Set up blinds, buy‑in & players
              </p>
            </div>
          </div>
        </button>

        {/* Recent Games (placeholder) */}
        <div className="rounded-2xl p-5 border"
          style={{
            background: 'var(--surface-card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent Games
          </h3>
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-tertiary)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No games yet — start one above!
            </p>
          </div>
        </div>

        {/* Stats teaser */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Games', value: '0' },
            { label: 'Hands', value: '0' },
            { label: 'Hours', value: '0' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center border"
              style={{
                background: 'var(--surface-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
