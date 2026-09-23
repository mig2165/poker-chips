import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { GameState } from '../engine'
import { loadRoom, subscribeToRoom, leaveRoom } from '../lib/onlineRoom'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function SpectatePage() {
  const { roomCode = '' } = useParams()
  const [game, setGame] = useState<GameState | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    void loadRoom(roomCode).then(remote => {
      setGame(remote)
      channel = subscribeToRoom(roomCode, setGame)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load table'))
    return () => { void leaveRoom(channel) }
  }, [roomCode])

  if (error) return <main className="p-6 text-center text-red-300">{error}</main>
  if (!game) return <main className="p-6 text-center text-slate-400">Loading table...</main>

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Spectating room {roomCode}</p>
      <h1 className="mt-2 text-3xl font-extrabold">Live table</h1>
      <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <div className="flex justify-between text-sm text-slate-400"><span>{game.hand ? `Hand #${game.hand.handNumber}` : 'Waiting for hand'}</span><span>Pot ${game.hand?.totalPot ?? 0}</span></div>
        <div className="mt-5 flex gap-2">{(game.hand?.boardCards ?? []).map(card => <span key={`${card.rank}${card.suit}`} className="rounded bg-white px-2 py-1 text-sm font-bold text-slate-900">{card.rank}{card.suit}</span>)}</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {game.players.map(player => (
            <div key={player.id} className="rounded-lg border border-slate-700 px-3 py-3">
              <div className="flex justify-between gap-3">
                <span>{player.name}</span>
                <span className="font-mono text-amber-300">${player.stack}</span>
              </div>
              {!player.isActive && player.holeCards.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  {player.holeCards.map(card => (
                    <span key={`${player.id}-${card.rank}${card.suit}`} className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-900">
                      {card.rank}{card.suit}
                    </span>
                  ))}
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-slate-500">Folded</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">Active players’ hole cards stay hidden. Folded cards may be shown.</p>
      </div>
    </main>
  )
}
