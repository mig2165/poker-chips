import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import type { Player } from '../engine'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { defaultConfig, updateConfig, createGame } = useGameStore()

  const [buyIn, setBuyIn] = useState(defaultConfig.buyIn.toString())
  const [playerNames, setPlayerNames] = useState<string[]>(['You', 'Player 2'])

  function handleAddPlayer() {
    if (playerNames.length < 7) {
      setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`])
    }
  }

  function handleRemovePlayer(index: number) {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index))
    }
  }

  function handleNameChange(index: number, newName: string) {
    const newNames = [...playerNames]
    newNames[index] = newName
    setPlayerNames(newNames)
  }

  function handleStartGame() {
    const finalBuyIn = parseInt(buyIn, 10) || 20
    updateConfig({ buyIn: finalBuyIn })

    // Create the game in the store
    createGame({ buyIn: finalBuyIn, maxPlayers: 7 })

    // Initialize players
    const players: Player[] = playerNames.map((name, index) => ({
      id: crypto.randomUUID(),
      name: name.trim() || `Player ${index + 1}`,
      seat: index,
      stack: finalBuyIn,
      totalBuyIn: finalBuyIn,
      sessionProfitLoss: 0,
      isActive: true,
      isSittingOut: false,
      currentBet: 0,
      hasActed: false,
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
              Players ({playerNames.length}/7)
            </h2>
            {playerNames.length < 7 && (
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
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--surface-tertiary)', color: 'var(--text-muted)' }}
                >
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(i, e.target.value)}
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
                {playerNames.length > 2 && (
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    className="p-2 shrink-0 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
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
