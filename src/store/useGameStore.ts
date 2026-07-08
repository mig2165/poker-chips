/**
 * src/store/useGameStore.ts
 *
 * Zustand store placeholder.
 * Will hold the full GameState and expose actions to mutate it.
 */

import { create } from 'zustand'
import { startHand, handleAction, awardPot, addRebuy } from '../engine'
import type { GameConfig, GameState, LogEntry, LogActionType } from '../engine'

interface GameStore {
  /** The current game, or null if no game is active. */
  game: GameState | null

  /** Default game config for new games */
  defaultConfig: GameConfig

  /** Update default config */
  updateConfig: (config: Partial<GameConfig>) => void

  /** Create a new game with the given configuration. */
  createGame: (config?: GameConfig) => void

  /** Engine Actions */
  startNextHand: () => void
  dispatchAction: (playerId: string, actionType: LogActionType, amount?: number) => void
  awardPotToPlayer: (winnerIds: string[]) => void
  rebuyPlayer: (playerId: string, amount: number) => void

  /** Add an entry to the action log directly (for UI only logs). */
  logAction: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void

  /** Reset everything. */
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,

  defaultConfig: {
    buyIn: 20,
    maxPlayers: 7,
  },

  updateConfig: (config) => 
    set((state) => ({ defaultConfig: { ...state.defaultConfig, ...config } })),

  createGame: (config) =>
    set((state) => ({
      game: {
        id: crypto.randomUUID(),
        config: config || state.defaultConfig,
        players: [],
        hand: null,
        handsPlayed: 0,
        actionLog: [],
        createdAt: Date.now(),
      },
    })),

  startNextHand: () =>
    set((state) => {
      if (!state.game) return state
      return { game: startHand(state.game) }
    }),

  dispatchAction: (playerId, actionType, amount) =>
    set((state) => {
      if (!state.game) return state
      return { game: handleAction(state.game, playerId, actionType, amount) }
    }),

  awardPotToPlayer: (winnerIds) =>
    set((state) => {
      if (!state.game) return state
      return { game: awardPot(state.game, winnerIds) }
    }),

  rebuyPlayer: (playerId, amount) =>
    set((state) => {
      if (!state.game) return state
      return { game: addRebuy(state.game, playerId, amount) }
    }),

  logAction: (entry) =>
    set((state) => {
      if (!state.game) return state
      const newEntry: LogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }
      return {
        game: {
          ...state.game,
          actionLog: [newEntry, ...state.game.actionLog], // newest first
        },
      }
    }),

  reset: () => set({ game: null }),
}))
