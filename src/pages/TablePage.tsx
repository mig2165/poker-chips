import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionLogDrawer from '../components/ActionLogDrawer'
import { useGameStore } from '../store/useGameStore'
import { decideBotAction } from '../engine'
import type { Player, LogActionType } from '../engine'

interface SeatPosition {
  x: number
  y: number
}

function getSeatPositions(count: number, width: number, height: number): SeatPosition[] {
  const cx = width / 2
  const cy = height / 2
  const rx = cx * 0.78
  const ry = cy * 0.72

  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI / 2) + (2 * Math.PI * i) / count
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    }
  })
}

export default function TablePage() {
  const navigate = useNavigate()
  const { game, bluffAlert, clearBluffAlert, startNextHand, dispatchAction, awardPotToPlayer, rebuyPlayer, connectOnlineRoom, disconnectOnlineRoom } = useGameStore()
  
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false)
  const [betAmount, setBetAmount] = useState('')
  const [betType, setBetType] = useState<'bet' | 'raise'>('bet')
  const [isSelectingWinner, setIsSelectingWinner] = useState(false)

  const botHand = game?.hand
  const botPlayer = botHand && game ? game.players[botHand.currentPlayerIndex] : null
  const localPlayerId = game?.players.find(player => player.isLocal)?.id

  useEffect(() => {
    if (!botHand || botHand.isComplete || !botPlayer?.isBot) return
    const timer = window.setTimeout(() => {
      const decision = decideBotAction(game!, botPlayer.id)
      dispatchAction(botPlayer.id, decision.actionType, decision.amount)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [botHand, botHand?.currentBettingRound, botHand?.currentPlayerIndex, botHand?.handNumber, botHand?.isComplete, botPlayer?.id, botPlayer?.isBot, botPlayer?.stack, dispatchAction, game])

  const players = game?.players ?? []
  const hand = game?.hand ?? null
  const tableW = 460
  const tableH = 520
  const seats = useMemo(
    () => getSeatPositions(Math.max(2, players.length), tableW, tableH),
    [players.length],
  )

  useEffect(() => {
    if (game?.config.mode !== 'online' || !game.config.roomCode) return
    void connectOnlineRoom(game.config.roomCode, localPlayerId).catch(error => {
      console.error('Could not connect to online room', error)
    })
    return () => {
      void disconnectOnlineRoom()
    }
  }, [connectOnlineRoom, disconnectOnlineRoom, game?.config.mode, game?.config.roomCode, localPlayerId])

  useEffect(() => {
    if (!bluffAlert) return
    let audioContext: AudioContext | null = null
    try {
      audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.12)
      oscillator.frequency.exponentialRampToValueAtTime(180, audioContext.currentTime + 0.38)
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.45)
    } catch {
      audioContext = null
    }
    const timer = window.setTimeout(() => {
      clearBluffAlert()
      if (audioContext) void audioContext.close()
    }, 2800)
    return () => {
      window.clearTimeout(timer)
      if (audioContext) void audioContext.close()
    }
  }, [bluffAlert, clearBluffAlert])

  // Redirect to lobby if no game
  if (!game) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold mb-4">No Active Game</h2>
          <button onClick={() => navigate('/settings')} className="px-6 py-3 rounded-xl bg-blue-600 font-bold">
            Create Game
          </button>
        </div>
      </div>
    )
  }

  const activePlayer = hand ? players[hand.currentPlayerIndex] : null
  const highestBet = hand ? Math.max(...players.map(p => p.currentBet)) : 0
  
  const canCheck = activePlayer ? activePlayer.currentBet === highestBet : false
  const callAmount = activePlayer ? highestBet - activePlayer.currentBet : 0
  const canControlTurn = Boolean(activePlayer && !activePlayer.isBot && (game.config.mode !== 'online' || activePlayer.isLocal))

  function handleAction(type: LogActionType) {
    if (!activePlayer || !canControlTurn) return
    dispatchAction(activePlayer.id, type)
  }

  function openBetModal(type: 'bet' | 'raise') {
    setBetType(type)
    setBetAmount('')
    setIsBetModalOpen(true)
  }

  function submitBet() {
    if (!activePlayer || !canControlTurn) return
    const amt = parseInt(betAmount, 10)
    if (!isNaN(amt) && amt > 0) {
      dispatchAction(activePlayer.id, betType, amt)
    }
    setIsBetModalOpen(false)
  }

  function handlePlayerTap(player: Player) {
    if (!game) return
    if (game.config.mode === 'chipless' && isSelectingWinner) {
      awardPotToPlayer([player.id])
      setIsSelectingWinner(false)
      return
    }
    if (player.isBot) return
    const rebuy = window.confirm(`Add $${game.config.buyIn} rebuy for ${player.name}?`)
    if (rebuy) {
      rebuyPlayer(player.id, game.config.buyIn)
    }
  }

  async function copyRoomInvite() {
    const currentGame = useGameStore.getState().game
    if (!currentGame?.config.roomCode) return
    const invite = `${window.location.origin}/?room=${currentGame.config.roomCode}`
    try {
      await navigator.clipboard.writeText(invite)
      window.alert(`Invite copied: ${invite}`)
    } catch {
      window.prompt('Copy this invite link:', invite)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col table-shell">
      {bluffAlert && (
        <div className="bluff-alert" role="status" aria-live="polite">
          <div className="bluff-alert-title">{bluffAlert}</div>
          <div className="bluff-alert-subtitle">You folded a winning hand.</div>
        </div>
      )}
      {/* Header Bar */}
      <header
        className="glass sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {hand ? `Hand #${hand.handNumber}` : 'Waiting to Start'}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {game.config.useBlinds ? `Blinds ${game.config.smallBlind} / ${game.config.bigBlind}` : `Minimum bet ${game.config.minimumBet}`}
          </p>
          {game.config.mode === 'online' && (
            <button onClick={copyRoomInvite} className="text-[10px] font-bold tracking-widest text-emerald-300 hover:text-white">
              ROOM {game.config.roomCode} · COPY INVITE
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLogOpen(true)}
            className="p-2 rounded-lg transition-colors border"
            style={{ 
              background: 'var(--surface-secondary)', 
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
        </div>
      </header>

      <div className="table-status mx-auto mt-3 w-[min(92%,34rem)] border px-4 py-3" role="status" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
              {hand?.currentBettingRound ? `${hand.currentBettingRound} street` : 'Ready table'}
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {!hand ? 'Start a hand when everyone is seated.' : hand.isComplete ? 'Showdown complete' : canControlTurn ? 'Your turn to act' : activePlayer?.isBot ? `${activePlayer.name} is deciding` : `Waiting for ${activePlayer?.name ?? 'the active player'}`}
            </p>
          </div>
          {hand && !hand.isComplete && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>To call</p>
              <p className="font-mono text-lg font-extrabold" style={{ color: 'var(--color-gold)' }}>${callAmount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Table Area */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="relative table-stage" style={{ width: tableW, height: tableH }}>
          {/* Felt Oval */}
          <div
            className="absolute inset-2 rounded-[50%] border-2 table-felt"
            style={{
              background: 'radial-gradient(ellipse at center, var(--color-felt-light) 0%, var(--color-felt) 60%, var(--color-felt-dark) 100%)',
              borderColor: 'var(--color-gold-dim)',
              boxShadow: 'inset 0 2px 30px rgba(0,0,0,0.4), 0 0 40px rgba(11, 77, 44, 0.3)',
            }}
          />

          {/* Community Cards & Pot Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
            {hand ? (
              <>
                <div className="flex gap-1.5 mb-2 perspective-1000">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const card = hand.boardCards && hand.boardCards[i]
                    const isRevealed = !!card

                    const rankDisplay = card ? (card.rank === 'T' ? '10' : card.rank) : ''
                    const suitSymbol = card ? { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit] : ''
                    const isRed = card ? (card.suit === 'H' || card.suit === 'D') : false
                    const textColor = isRed ? '#e11d48' : '#0f172a'

                    return (
                      <div 
                        key={i}
                        className={`w-10 h-14 relative community-card ${isRevealed ? 'is-revealed' : ''}`}
                        style={{
                          perspective: '1000px',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        <div 
                          className="absolute inset-0 w-full h-full rounded-md border border-white/20 shadow-md transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            background: isRevealed 
                              ? 'transparent' // Handled by back face
                              : 'radial-gradient(circle at 50% 50%, var(--surface-primary) 0%, var(--surface-secondary) 100%)',
                            backgroundSize: '3px 3px'
                          }}
                        >
                          {!isRevealed && (
                            <div className="absolute inset-1 rounded-sm border border-white/10 opacity-30 flex items-center justify-center">
                               <div className="w-4 h-4 opacity-20 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {/* Revealed Face */}
                        <div 
                          className="absolute inset-0 w-full h-full bg-white rounded-md flex flex-col items-center justify-center shadow-md transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: isRevealed ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                            color: textColor,
                          }}
                        >
                          {card && game.config.mode !== 'chipless' && (
                            <div className="flex flex-col items-center justify-center leading-tight select-none">
                              <span className="text-[14px] font-black font-mono leading-none">{rankDisplay}</span>
                              <span className="text-base leading-none mt-0.5">{suitSymbol}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-center bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10 shadow-lg">
                  <div className="text-lg font-extrabold font-mono" style={{ color: 'var(--color-gold)' }}>
                    ${hand.totalPot}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center opacity-50">
                <div className="text-xl font-bold font-mono">Game Ready</div>
              </div>
            )}
          </div>

          {/* Player Seats */}
          {players.map((player, i) => {
            const pos = seats[i]
            if (!pos) return null
            
            const isTurn = hand && !hand.isComplete && hand.currentPlayerIndex === i
            const isDealer = hand && hand.dealerSeat === i
            const isProfit = player.sessionProfitLoss >= 0
            const plColor = isProfit ? '#22c55e' : '#ef4444'
            
            return (
              <div
                key={player.id}
                onClick={() => handlePlayerTap(player)}
                className={`absolute flex flex-col items-center transition-all duration-300 cursor-pointer ${!player.isActive && hand ? 'opacity-40 grayscale' : ''}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Avatar */}
                <div
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-4 transition-all duration-200 ${isTurn ? 'scale-110' : ''}`}
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: isTurn ? 'var(--color-gold)' : isDealer ? 'var(--color-gold-dim)' : 'var(--border-subtle)',
                    boxShadow: isTurn ? '0 0 24px rgba(245, 197, 66, 0.4)' : 'var(--shadow-card)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                  
                  {/* Dealer Button */}
                  {isDealer && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shadow-md"
                      style={{ background: 'var(--color-gold)', color: 'var(--surface-primary)' }}
                    >D</span>
                  )}
                  
                  {/* Current Bet floating chip */}
                  {hand && player.currentBet > 0 && (
                    <div className="absolute -top-6 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white text-black shadow-lg">
                      ${player.currentBet}
                    </div>
                  )}

                  {/* P/L Badge */}
                  <div 
                    className="absolute -bottom-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-md"
                    style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)', color: plColor }}
                  >
                    {isProfit ? '+' : ''}{player.sessionProfitLoss}
                  </div>
                </div>

                {/* Name + Stack */}
                <div className="mt-3 text-center bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                  <div className="text-xs font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                    {player.name}
                  </div>
                  <div className="text-[11px] font-mono font-medium" style={{ color: 'var(--text-accent)' }}>
                    ${player.stack}
                  </div>
                  {hand && player.holeCards.length > 0 && game.config.mode !== 'chipless' && (player.isLocal || hand.isComplete) && (
                    <div className="flex gap-1 justify-center mt-1">
                      {player.holeCards.map(card => {
                        const symbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit]
                        const red = card.suit === 'H' || card.suit === 'D'
                        return (
                          <span key={`${card.rank}${card.suit}`} className={`player-card rounded bg-white px-1.5 py-0.5 text-xs font-black shadow ${hand.isComplete ? 'showdown-reveal' : ''}`} style={{ color: red ? '#e11d48' : '#0f172a' }}>
                            {card.rank === 'T' ? '10' : card.rank}{symbol}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {hand && game.config.mode === 'chipless' && (
                    <div className="flex gap-1 justify-center mt-1" aria-label="Cards are tracked with physical cards">
                      <span className="h-5 w-4 rounded-sm border border-white/25 bg-slate-700/70" />
                      <span className="h-5 w-4 rounded-sm border border-white/25 bg-slate-700/70" />
                    </div>
                  )}
                  {game.config.mode !== 'chipless' && hand?.showdownWinners.includes(player.id) && (
                    <div className="mt-1 rounded-md bg-green-500 px-2 py-0.5 text-[9px] font-black text-black">
                      WINNER
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Action Bar */}
      <div className="glass border-t p-4 pb-safe" style={{ borderColor: 'var(--border-subtle)' }}>
        {!hand || hand.isComplete ? (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {hand && hand.isComplete && game.config.mode === 'chipless' && !isSelectingWinner && (
              <button onClick={() => setIsSelectingWinner(true)} className="w-full rounded-lg bg-green-600 py-4 text-lg font-extrabold shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                SELECT WINNER
              </button>
            )}
            {isSelectingWinner && (
              <p className="text-center text-sm font-bold text-green-400">Tap the player who won the physical hand.</p>
            )}
            {hand && hand.isComplete && game.config.mode !== 'chipless' && game.config.mode !== 'online' && (
              <>
                <p className="text-center text-sm font-bold text-green-400">
                  Winner{hand.showdownWinners.length === 1 ? '' : 's'}: {hand.showdownWinners.map(id => players.find(player => player.id === id)?.name).filter(Boolean).join(', ') || 'No eligible player'}
                </p>
                <button onClick={() => awardPotToPlayer(hand.showdownWinners)} className="w-full py-4 rounded-xl font-extrabold text-lg bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  AWARD CALCULATED POT{hand.pots.length > 1 ? 'S' : ''}
                </button>
              </>
            )}
            <button
              onClick={startNextHand}
              disabled={game.config.mode === 'online' && Boolean(hand?.isComplete)}
              className="w-full py-4 rounded-xl font-bold border border-gold/50 text-gold disabled:cursor-wait disabled:opacity-60"
              style={{ color: 'var(--color-gold)', borderColor: 'var(--color-gold-dim)' }}
            >
              {game.config.mode === 'online' && hand?.isComplete ? 'Revealing Showdown...' : hand ? 'Start Next Hand' : 'Start First Hand'}
            </button>
            <p className="text-center text-xs text-muted/50">Tip: Tap a player to process a Rebuy.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-lg mx-auto">
            {!canControlTurn && (
              <p className="text-center text-sm text-slate-400">
                {activePlayer?.isBot ? `${activePlayer.name} is deciding...` : `Waiting for ${activePlayer?.name ?? 'the active player'}...`}
              </p>
            )}
            {canControlTurn && <div className="flex items-center gap-2">
            <button onClick={() => handleAction('fold')} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500/10 border border-red-500/30 text-red-500 active:scale-95 transition-transform">
              Fold
            </button>
            
            {canCheck ? (
              <button onClick={() => handleAction('check')} className="flex-1 py-3 rounded-xl text-sm font-bold bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-transform">
                Check
              </button>
            ) : (
              <button onClick={() => handleAction('call')} className="flex-1 flex flex-col items-center py-2 rounded-xl text-sm font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 active:scale-95 transition-transform">
                <span>Call</span>
                <span className="text-[10px] font-mono font-normal">${callAmount}</span>
              </button>
            )}

            <button onClick={() => openBetModal(canCheck ? 'bet' : 'raise')} className="flex-1 flex flex-col items-center py-2 rounded-xl text-sm font-bold bg-gold/10 border border-gold/30 text-gold active:scale-95 transition-transform" style={{ color: 'var(--color-gold)', borderColor: 'var(--color-gold-dim)', backgroundColor: 'rgba(245, 197, 66, 0.1)' }}>
              <span>{canCheck ? 'Bet' : 'Raise'}</span>
              <span className="text-[10px] font-mono font-normal">...</span>
            </button>
            </div>}
          </div>
        )}
      </div>

      <ActionLogDrawer isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* Bet/Raise Modal */}
      {isBetModalOpen && activePlayer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-safe">
          <div className="w-full max-w-sm rounded-3xl p-5 border shadow-2xl" style={{ background: 'var(--surface-primary)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-center font-bold text-lg mb-4">{betType === 'bet' ? 'Bet' : 'Raise'} Amount</h3>
            
            <input 
              type="number" 
              value={betAmount} 
              onChange={e => setBetAmount(e.target.value)} 
              placeholder={`To...`}
              className="w-full py-4 px-4 text-center text-3xl font-mono font-bold bg-slate-800 rounded-xl mb-4 outline-none border border-slate-700 focus:border-gold"
              autoFocus
            />

            <div className="grid grid-cols-4 gap-2 mb-6">
              <button onClick={() => setBetAmount((highestBet + (hand?.lastRaiseSize ?? game.config.minimumBet)).toString())} className="py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">Min</button>
              <button onClick={() => setBetAmount(Math.floor((hand?.totalPot ?? 0) / 2 + highestBet).toString())} className="py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">½ Pot</button>
              <button onClick={() => setBetAmount(((hand?.totalPot ?? 0) + highestBet).toString())} className="py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300">Pot</button>
              <button onClick={() => setBetAmount((activePlayer.currentBet + activePlayer.stack).toString())} className="py-2 rounded-lg bg-slate-800 text-xs font-bold text-red-400">All-In</button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsBetModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800 text-slate-300">Cancel</button>
              <button onClick={submitBet} className="flex-[2] py-3 rounded-xl font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dim))', color: '#000' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
