/**
 * src/store/useGameStore.ts
 *
 * Zustand store placeholder.
 * Will hold the full GameState and expose actions to mutate it.
 */

import { create } from 'zustand'
import { startHand, handleAction, awardPot, addRebuy } from '../engine'
import type { GameConfig, GameState, LogEntry, LogActionType } from '../engine'
import type { Player } from '../engine'
import { compareEvaluatedHands, evaluateCards } from '../engine/handEvaluator'
import { loadRoom, publishRoom, subscribeToRoom, leaveRoom, savePrivateCards, loadPrivateCards } from '../lib/onlineRoom'
import { recordProfileGame } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

let roomChannel: RealtimeChannel | null = null
const scheduledShowdowns = new Set<number>()

function getBluffMessage(game: GameState): string | null {
  if (game.config.mode !== 'online' || !game.hand?.isComplete || !game.hand.boardCards.length) return null
  const localPlayer = game.players.find(player => player.isLocal)
  if (!localPlayer || localPlayer.isActive || localPlayer.holeCards.length !== 2) return null
  const winners = game.players.filter(player => game.hand?.showdownWinners.includes(player.id))
  if (winners.length === 0) return null
  const foldedScore = evaluateCards([...localPlayer.holeCards, ...game.hand.boardCards])
  const bestWinnerScore = winners.reduce((best, player) => {
    const score = evaluateCards([...player.holeCards, ...game.hand!.boardCards])
    return compareEvaluatedHands(score, best) > 0 ? score : best
  }, evaluateCards([...winners[0].holeCards, ...game.hand.boardCards]))
  return compareEvaluatedHands(foldedScore, bestWinnerScore) > 0 ? 'GET BLUFFED' : null
}

function scheduleOnlineResolution(game: GameState): void {
  if (game.config.mode !== 'online' || !game.hand?.isComplete) return
  if (scheduledShowdowns.has(game.hand.handNumber)) return
  scheduledShowdowns.add(game.hand.handNumber)
  window.setTimeout(() => {
    const current = useGameStore.getState().game
    if (current?.hand?.isComplete && current.hand.handNumber === game.hand?.handNumber) {
      useGameStore.getState().awardPotToPlayer(current.hand.showdownWinners)
    }
    scheduledShowdowns.delete(game.hand?.handNumber ?? -1)
  }, 3000)
}

function syncGame(game: GameState | null): void {
  if (!game) return
  const shouldReveal = game.config.mode === 'online' && Boolean(game.hand?.isComplete)
  if (game.config.mode === 'online' && game.config.roomCode) {
    const publishedGame = shouldReveal && game.hand
      ? { ...game, hand: { ...game.hand, revealAllCards: true } }
      : game
    void publishRoom(game.config.roomCode, publishedGame, shouldReveal).catch(error => console.error('Online room sync failed', error))
    const localPlayer = game.players.find(player => player.isLocal)
    if (localPlayer) {
      void savePrivateCards(game.config.roomCode, localPlayer).catch(error => console.error('Private card sync failed', error))
    }

  }
  if (shouldReveal) {
    scheduleOnlineResolution(game)
  }
}

interface GameStore {
  /** The current game, or null if no game is active. */
  game: GameState | null
  bluffAlert: string | null

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
  connectOnlineRoom: (roomCode: string, playerId?: string) => Promise<void>
  publishOnlineGame: () => Promise<void>
  disconnectOnlineRoom: () => Promise<void>
  joinOnlineRoom: (roomCode: string, playerName: string, buyIn: number) => Promise<void>
  clearBluffAlert: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  bluffAlert: null,

  defaultConfig: {
    buyIn: 20,
    maxPlayers: 7,
    minimumBet: 2,
    useBlinds: true,
    smallBlind: 1,
    bigBlind: 2,
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
      const game = startHand(state.game)
      syncGame(game)
      return { game }
    }),

  dispatchAction: (playerId, actionType, amount) =>
    set((state) => {
      if (!state.game) return state
      const game = handleAction(state.game, playerId, actionType, amount)
      syncGame(game)
      const revealGame = game.config.mode === 'online' && game.hand?.isComplete && game.hand
        ? { ...game, hand: { ...game.hand, revealAllCards: true } }
        : game
      return { game: revealGame, bluffAlert: getBluffMessage(revealGame) }
    }),

  awardPotToPlayer: (winnerIds) =>
    set((state) => {
      if (!state.game) return state
      const localBefore = state.game.players.find(player => player.isLocal)?.stack ?? 0
      const gameId = state.game.id
      const handNumber = state.game.hand?.handNumber ?? 0
      const game = awardPot(state.game, winnerIds)
      syncGame(game)
      const localAfter = game.players.find(player => player.isLocal)?.stack ?? localBefore
      void recordProfileGame(gameId, handNumber, localAfter - localBefore).catch(error => console.error('Profile stats update failed', error))
      return { game }
    }),

  rebuyPlayer: (playerId, amount) =>
    set((state) => {
      if (!state.game) return state
      const game = addRebuy(state.game, playerId, amount)
      syncGame(game)
      return { game }
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
  clearBluffAlert: () => set({ bluffAlert: null }),
  connectOnlineRoom: async (roomCode, playerId) => {
    const remote = await loadRoom(roomCode)
    if (!remote) throw new Error('Room not found')
    const localPlayer = playerId ? remote.players.find(player => player.id === playerId) : undefined
    if (localPlayer && playerId) localPlayer.holeCards = await loadPrivateCards(roomCode, playerId)
    set({ game: remote })
    roomChannel = subscribeToRoom(roomCode, remoteGame => {
      set(state => {
        if (!state.game) return { game: remoteGame }
        const mergedPlayers = remoteGame.players.map(remotePlayer => {
          const local = state.game?.players.find(player => player.id === remotePlayer.id)
          return {
            ...remotePlayer,
            holeCards: remoteGame.hand?.revealAllCards || !remotePlayer.isActive ? remotePlayer.holeCards : local?.holeCards ?? [],
          }
        })
        const mergedGame = { ...remoteGame, players: mergedPlayers }
        scheduleOnlineResolution(mergedGame)
        return { game: mergedGame, bluffAlert: getBluffMessage(mergedGame) }
      })
    })
  },
  publishOnlineGame: async () => {
    const game = useGameStore.getState().game
    if (!game?.config.roomCode) return
    await publishRoom(game.config.roomCode, game)
    const localPlayer = game.players.find(player => player.isLocal)
    if (localPlayer) await savePrivateCards(game.config.roomCode, localPlayer)
  },
  disconnectOnlineRoom: async () => {
    await leaveRoom(roomChannel)
    roomChannel = null
  },
  joinOnlineRoom: async (roomCode, playerName, buyIn) => {
    const remote = await loadRoom(roomCode)
    if (!remote) throw new Error('Room not found')
    if (remote.players.length >= remote.config.maxPlayers) throw new Error('This room is full')
    const player: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim() || 'Player',
      seat: remote.players.length,
      stack: buyIn,
      totalBuyIn: buyIn,
      sessionProfitLoss: 0,
      isActive: true,
      isSittingOut: false,
      currentBet: 0,
      handContribution: 0,
      holeCards: [],
      hasActed: false,
      isBot: false,
      isLocal: true,
    }
    const game = { ...remote, players: [...remote.players.map(item => ({ ...item, isLocal: false })), player] }
    set({ game })
    await publishRoom(roomCode, game)
    await savePrivateCards(roomCode, player)
    roomChannel = subscribeToRoom(roomCode, remoteGame => {
      set(state => {
        if (!state.game) {
          scheduleOnlineResolution(remoteGame)
          return { game: remoteGame, bluffAlert: getBluffMessage(remoteGame) }
        }
        const mergedGame = {
          ...remoteGame,
          players: remoteGame.players.map(remotePlayer => ({
            ...remotePlayer,
            holeCards: !remotePlayer.isActive
              ? remotePlayer.holeCards
              : state.game?.players.find(item => item.id === remotePlayer.id)?.holeCards ?? [],
          })),
        }
        scheduleOnlineResolution(mergedGame)
        return { game: mergedGame, bluffAlert: getBluffMessage(mergedGame) }
      })
    })
  },
}))
