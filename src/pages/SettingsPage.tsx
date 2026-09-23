import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import type { Player } from '../engine'
import { createRoom } from '../lib/onlineRoom'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

interface Friend {
  id: string
  username: string
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { defaultConfig, updateConfig, createGame, joinOnlineRoom } = useGameStore()
  const activeGame = useGameStore(state => state.game)

  const [buyIn, setBuyIn] = useState(defaultConfig.buyIn.toString())
  const [playerNames, setPlayerNames] = useState<string[]>(['You', 'Player 2'])
  const [friends, setFriends] = useState<Friend[]>([])
  const [invitedFriends, setInvitedFriends] = useState<Friend[]>([])
  const [friendMessage, setFriendMessage] = useState('')
  const [mode, setMode] = useState<'local' | 'bots' | 'online' | 'chipless'>('local')
  const [roomCode, setRoomCode] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [minimumBet, setMinimumBet] = useState(defaultConfig.minimumBet.toString())
  const [useBlinds, setUseBlinds] = useState(defaultConfig.useBlinds)
  const [smallBlind, setSmallBlind] = useState(defaultConfig.smallBlind.toString())
  const [bigBlind, setBigBlind] = useState(defaultConfig.bigBlind.toString())

  useEffect(() => {
    if (activeGame) navigate('/table', { replace: true })
  }, [activeGame, navigate])

  useEffect(() => {
    if (!supabase) return
    void (async () => {
      const { data: current } = await supabase.auth.getUser()
      if (!current.user || current.user.is_anonymous) return
      const { data: requests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${current.user.id},receiver_id.eq.${current.user.id}`)
        .eq('status', 'accepted')
      const friendIds = (requests ?? []).map(request => request.sender_id === current.user.id ? request.receiver_id : request.sender_id)
      if (friendIds.length === 0) return
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', friendIds)
      setFriends(profiles ?? [])
    })().catch(error => setFriendMessage(error instanceof Error ? error.message : 'Could not load friends'))
  }, [])

  function handleAddPlayer() {
    if (playerNames.length < 7) {
      setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`])
    }
  }

  function handleRemovePlayer(index: number) {
    if (playerNames.length > 2 || (mode === 'online' && playerNames.length > 1)) {
      setPlayerNames(playerNames.filter((_, i) => i !== index))
    }
  }

  function handleNameChange(index: number, newName: string) {
    const newNames = [...playerNames]
    newNames[index] = newName
    setPlayerNames(newNames)
  }

  function inviteFriend(friend: Friend) {
    if (invitedFriends.some(item => item.id === friend.id)) {
      setInvitedFriends(current => current.filter(item => item.id !== friend.id))
    } else if (invitedFriends.length < 6) {
      setInvitedFriends(current => [...current, friend])
    }
  }

  async function handleStartGame() {
    const finalBuyIn = parseInt(buyIn, 10) || 20
    const finalMinimumBet = Math.max(1, parseInt(minimumBet, 10) || 2)
    const finalSmallBlind = Math.max(0, parseInt(smallBlind, 10) || 1)
    const finalBigBlind = Math.max(finalSmallBlind, parseInt(bigBlind, 10) || 2)
    updateConfig({ buyIn: finalBuyIn, minimumBet: finalMinimumBet, useBlinds, smallBlind: finalSmallBlind, bigBlind: finalBigBlind })

    // Create the game in the store
    const finalRoomCode = mode === 'online' ? (roomCode.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()) : undefined
    createGame({ buyIn: finalBuyIn, maxPlayers: 7, mode, roomCode: finalRoomCode, isPublic, minimumBet: finalMinimumBet, useBlinds, smallBlind: finalSmallBlind, bigBlind: finalBigBlind })

    // Initialize players
    const names = mode === 'bots' ? ['You', 'Ruby Bot', 'Ace Bot'] : mode === 'online' ? ['You'] : playerNames
    const players: Player[] = names.map((name, index) => ({
      id: crypto.randomUUID(),
      name: name.trim() || `Player ${index + 1}`,
      seat: index,
      stack: finalBuyIn,
      totalBuyIn: finalBuyIn,
      sessionProfitLoss: 0,
      isActive: true,
      isSittingOut: false,
      currentBet: 0,
      handContribution: 0,
      holeCards: [],
      hasActed: false,
      isBot: mode === 'bots' && index > 0,
      isLocal: index === 0,
    }))

    // Directly mutate the store's game object with players
    useGameStore.setState((state) => {
      if (!state.game) return state
      return {
        game: {
          ...state.game,
          players,
        }
      }
    })

    if (mode === 'online') {
      if (!hasSupabaseConfig()) {
        window.alert('Add the Supabase values to .env.local before creating an online room.')
        return
      }
      try {
        if (roomCode.trim()) {
          await joinOnlineRoom(roomCode.trim().toUpperCase(), players[0].name, finalBuyIn)
          navigate('/table')
          return
        }
        const createdGame = useGameStore.getState().game
        if (createdGame && finalRoomCode) {
          await createRoom(finalRoomCode, players[0].name, createdGame)
        }
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not create online room')
        return
      }
    }

    navigate('/table')
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="pt-14 pb-4 px-6">
        <h1 className="text-2xl font-extrabold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Game Setup
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Configure buy-in and add up to 7 players
        </p>
      </header>

      <div className="flex-1 px-5 pb-safe flex flex-col gap-5 overflow-y-auto">
        {/* Buy-in */}
        <section
          className="rounded-2xl p-5 border shrink-0"
          style={{
            background: 'var(--surface-card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Buy-In & Stack
          </h2>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="input-buy-in"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Buy-In Amount
                </label>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Acts as the starting stack
                </div>
              </div>
              <input
                id="input-buy-in"
                type="number"
                inputMode="numeric"
                min={1}
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
                className="w-24 py-2 px-3 rounded-xl text-right text-sm font-mono font-semibold border outline-none transition-all duration-200 focus:ring-2"
                style={{
                  background: 'var(--surface-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  // @ts-expect-error -- CSS custom property
                  '--tw-ring-color': 'var(--border-active)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Players List */}
        <section className="rounded-2xl p-5 border shrink-0" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Game Mode</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['local', 'Home table', 'Everyone visible'],
              ['bots', 'Solo vs bots', 'You + 2 bots'],
              ['online', 'Online room', 'Share a room code'],
              ['chipless', 'Chipless', 'Track real chips'],
            ] as const).map(([value, title, detail]) => (
              <button key={value} onClick={() => setMode(value)} className="rounded-xl border p-3 text-left transition-all" style={{ borderColor: mode === value ? 'var(--color-gold)' : 'var(--border-subtle)', background: mode === value ? 'rgba(245,197,66,.12)' : 'var(--surface-secondary)' }}>
                <div className="text-xs font-bold">{title}</div>
                <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{detail}</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Home table is for people physically together using one device. Bots is the solo option. Online is for remote players joining the same room.</p>
          {mode === 'online' && <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>You start alone. Share the room code, or invite an accepted friend below. Friends join as they connect.</p>}
          {mode === 'online' && (
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} />
              <span><strong>Public room</strong><br /><span className="text-slate-500">Anyone can discover this room and request a seat. Turn this off for invite/link/code only.</span></span>
            </label>
          )}
          {mode === 'online' && (
            <input
              value={roomCode}
              onChange={event => setRoomCode(event.target.value)}
              placeholder="Leave blank to create a new room"
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          )}
        </section>

        <section className="rounded-2xl border p-5" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Betting Rules</h2>
          <p className="mb-4 text-xs leading-5 text-slate-400">Buy-in is your starting stack. Minimum bet is the smallest wager during a betting round. Blinds are forced opening bets and are separate from both.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Minimum bet
              <input type="number" min={1} value={minimumBet} onChange={event => setMinimumBet(event.target.value)} className="mt-1 w-full rounded-xl border bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={useBlinds} onChange={event => setUseBlinds(event.target.checked)} />
              Use small and big blinds
            </label>
            {useBlinds && <>
              <label className="text-xs text-slate-400">Small blind
                <input type="number" min={0} value={smallBlind} onChange={event => setSmallBlind(event.target.value)} className="mt-1 w-full rounded-xl border bg-slate-800 px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-slate-400">Big blind
                <input type="number" min={1} value={bigBlind} onChange={event => setBigBlind(event.target.value)} className="mt-1 w-full rounded-xl border bg-slate-800 px-3 py-2 text-sm text-white" />
              </label>
            </>}
          </div>
        </section>

        {/* Players List */}
        <section
          className="rounded-2xl p-5 border flex-1 flex flex-col"
          style={{
            background: 'var(--surface-card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Players ({mode === 'bots' ? 3 : mode === 'online' ? 1 + invitedFriends.length : playerNames.length}/7)
            </h2>
            {mode !== 'bots' && mode !== 'online' && playerNames.length < 7 && (
              <button
                onClick={handleAddPlayer}
                className="text-xs font-bold transition-colors"
                style={{ color: 'var(--text-accent)' }}
              >
                + ADD
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {(mode === 'bots' ? ['You', 'Ruby Bot', 'Ace Bot'] : mode === 'online' ? ['You', ...invitedFriends.map(friend => friend.username)] : playerNames).map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--surface-tertiary)', color: 'var(--text-muted)' }}
                >
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => mode !== 'bots' && mode !== 'online' && handleNameChange(i, e.target.value)}
                  readOnly={mode === 'bots' || mode === 'online'}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold border outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    // @ts-expect-error -- CSS custom property
                    '--tw-ring-color': 'var(--border-active)',
                  }}
                />
                {mode === 'online' && i > 0 ? (
                  <button onClick={() => inviteFriend(invitedFriends[i - 1])} className="p-2 shrink-0 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors" aria-label={`Remove ${name}`}>
                    ×
                  </button>
                ) : mode !== 'bots' && playerNames.length > 2 ? (
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    className="p-2 shrink-0 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ))}
            {mode === 'online' && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400">Invite an accepted friend</p>
                {friendMessage && <p className="mt-2 text-xs text-amber-300">{friendMessage}</p>}
                {friends.length === 0 && !friendMessage && <p className="mt-2 text-xs text-slate-500">No accepted friends available yet.</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {friends.filter(friend => !invitedFriends.some(invited => invited.id === friend.id)).map(friend => (
                    <button key={friend.id} onClick={() => inviteFriend(friend)} className="rounded-lg border border-emerald-400/50 px-3 py-2 text-xs font-semibold text-emerald-300">
                      + {friend.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className="w-full shrink-0 rounded-2xl py-4 text-base font-bold shadow-lg transition-transform active:scale-[0.98] border"
          style={{
            background: 'linear-gradient(135deg, var(--color-felt-light), var(--color-felt))',
            borderColor: 'var(--color-gold-dim)',
            color: 'var(--color-gold)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          START GAME
        </button>
      </div>
    </div>
  )
}
