import { useNavigate } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react'
import { useGameStore } from '../store/useGameStore'
import { listPublicRooms, requestRoomJoin, type PublicRoom } from '../lib/onlineRoom'
import { hasSupabaseConfig } from '../lib/supabase'

export default function LobbyPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '')
  const [spectateCode, setSpectateCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [roomMessage, setRoomMessage] = useState('')
  const { game: activeGame, defaultConfig, joinOnlineRoom } = useGameStore()

  useEffect(() => {
    void listPublicRooms().then(setPublicRooms).catch(() => setPublicRooms([]))
  }, [])

  async function requestSeat(room: PublicRoom) {
    const name = window.prompt('Name to show at the table:', 'Guest')
    if (name === null) return
    try {
      await requestRoomJoin(room.roomCode, name)
      setRoomMessage(`Request sent to ${room.hostName}. Use the room code after the host approves you.`)
    } catch (error) {
      setRoomMessage(error instanceof Error ? error.message : 'Could not request a seat')
    }
  }

  function handleNewGame() {
    navigate(activeGame ? '/table' : '/settings')
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setRoomMessage('Enter the room code your friend shared with you.')
      return
    }
    if (activeGame) {
      setRoomMessage('Leave your current table before joining another one.')
      return
    }
    if (!hasSupabaseConfig()) {
      setRoomMessage('Online rooms are not configured on this site right now.')
      return
    }

    setIsJoiningRoom(true)
    setRoomMessage('')
    try {
      await joinOnlineRoom(code, playerName.trim() || 'Guest', defaultConfig.buyIn)
      navigate('/table')
    } catch (error) {
      setRoomMessage(error instanceof Error ? error.message : 'Could not join this room.')
    } finally {
      setIsJoiningRoom(false)
    }
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
        <form onSubmit={event => void handleJoinRoom(event)} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold">Join a private table</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Enter the room code your friend shared. You can join with a code even if the room is not public.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={joinCode}
              onChange={event => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Room code"
              aria-label="Private table room code"
              autoComplete="off"
              maxLength={12}
              className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              value={playerName}
              onChange={event => setPlayerName(event.target.value)}
              placeholder="Your name (optional)"
              aria-label="Name to show at the table"
              maxLength={24}
              className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isJoiningRoom || Boolean(activeGame)}
              className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-bold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isJoiningRoom ? 'Joining…' : 'Join table'}
            </button>
          </div>
          {roomMessage && <p role="status" className="mt-2 text-xs text-amber-300">{roomMessage}</p>}
          {activeGame && <p className="mt-2 text-xs text-slate-500">Leave your current table before joining another.</p>}
        </form>
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
            <input value={spectateCode} onChange={event => setSpectateCode(event.target.value)} placeholder="Room code" className="min-w-0 flex-1 rounded-lg border bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={() => spectateCode.trim() && navigate(`/spectate/${spectateCode.trim().toUpperCase()}`)} className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-bold text-amber-300">Watch</button>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-sm font-bold">Public rooms</h2>
            <p className="mt-1 text-xs text-slate-400">Request a seat in a room whose host has made it discoverable.</p>
            {roomMessage && <p className="mt-2 text-xs text-emerald-300">{roomMessage}</p>}
            <div className="mt-3 space-y-2">
              {publicRooms.length === 0 && <p className="text-xs text-slate-500">No public rooms are waiting right now.</p>}
              {publicRooms.map(room => (
                <div key={room.roomCode} className="flex items-center gap-3 border border-slate-700 px-3 py-2">
                  <div className="flex-1 text-xs"><strong>{room.hostName}'s room</strong><br /><span className="text-slate-500">{room.playerCount}/{room.maxPlayers} players · code {room.roomCode}</span></div>
                  <button onClick={() => void requestSeat(room)} className="border border-emerald-400/60 px-2 py-1 text-xs font-bold text-emerald-300">Request seat</button>
                </div>
              ))}
            </div>
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
