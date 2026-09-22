/**
 * src/engine/index.ts
 *
 * Barrel export for the game engine.
 * All pure game logic will live under src/engine/.
 * React components import from here, never the other way around.
 */

export type {
  Player,
  BettingAction,
  BettingRound,
  Pot,
  GameConfig,
  HandState,
  GameState,
  Card,
  Suit,
  Rank,
  LogEntry,
  LogActionType,
} from './types'

// Logic exports
export { startHand, handleAction, awardPot, addRebuy, decideBotAction } from './logic'
export type { BotDecision } from './logic'
// export { validateAction, getValidActions }     from './rules'
