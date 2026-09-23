import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function LobbyPage() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')

  function handleNewGame() {
    navigate('/settings')
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="pt-14 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{
            background: 'var(--color-felt)',
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
          <span style={{ color: 'var(--color-gold)' }}>Poker Chips</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Virtual chip tracker for live home games
        </p>
      </header>

      {/* Quick Actions */}
      <section className="flex-1 px-5 pb-6 flex flex-col gap-4">
        <div className="flex justify-end gap-3 text-sm">
          <button onClick={() => navigate('/profile')} className="text-slate-300 underline">Profile</button>
          <button onClick={() => navigate('/friends')} className="text-slate-300 underline">Friends</button>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Choose your table</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Track a real home game, play a guided bot table, or run the rules yourself with physical cards.
          </p>
        </div>
        <button onClick={() => navigate('/hand-decider')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Hand Decider</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Compare up to eight hands against a chosen board and get the rule explanation.</p>
            </div>
            <span className="border border-amber-400/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">Sandbox</span>
          </div>
        </button>
        {/* New Game Card */}
        <button
          id="btn-new-game"
          onClick={handleNewGame}
          className="w-full rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer border"
          style={{
            background: 'var(--color-felt-dark)',
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
            <span className="ml-auto border border-emerald-400/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Start here</span>
          </div>
        </button>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold">Spectate a table</h2>
          <div className="mt-3 flex gap-2">
            <input value={roomCode} onChange={event => setRoomCode(event.target.value)} placeholder="Room code" className="min-w-0 flex-1 rounded-lg border bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={() => roomCode.trim() && navigate(`/spectate/${roomCode.trim().toUpperCase()}`)} className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-bold text-amber-300">Watch</button>
          </div>
        </div>

        {/* Honest empty state until persistent game history is added. */}
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
              No saved games yet. Start a new table above.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
