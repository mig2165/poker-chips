/**
 * src/engine/types.ts
 *
 * Core type definitions for the poker game engine.
 * This module is pure TypeScript with no React or side effects.
 */

// ─── Player ───────────────────────────────────────────────
export interface Player {
  id: string
  name: string
  seat: number          // 0-based seat index
  stack: number         // current chip count
  totalBuyIn: number    // total amount of chips bought in for (including rebuys)
  sessionProfitLoss: number // stack - totalBuyIn
  isActive: boolean     // still in the hand (hasn't folded)
  isSittingOut: boolean // sitting out entirely
  currentBet: number    // amount committed in the current betting round
  handContribution: number // total amount committed across the current hand
  holeCards: Card[]     // two private cards dealt to this player
  hasActed: boolean     // whether the player has acted this round
  isBot: boolean
  isLocal: boolean
}

// ─── Betting ──────────────────────────────────────────────
export type BettingAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'all-in' }
  | { type: 'rebuy'; amount: number }

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river'

export type Suit = 'S' | 'H' | 'D' | 'C' // S = Spades, H = Hearts, D = Diamonds, C = Clubs
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  rank: Rank
  suit: Suit
}

// ─── Pot ──────────────────────────────────────────────────
export interface Pot {
  amount: number
  eligiblePlayerIds: string[]
  winnerIds?: string[]
  winningHand?: string
}

// ─── Game Configuration ───────────────────────────────────
export interface GameConfig {
  buyIn: number           // Base buy-in amount, also dictates starting stack
  maxPlayers: number      // Maximum 7
  mode?: 'local' | 'bots' | 'online' | 'chipless'
  roomCode?: string
  isPublic?: boolean
  minimumBet: number
  useBlinds: boolean
  smallBlind: number
  bigBlind: number
}

// ─── Logging ──────────────────────────────────────────────
export type LogActionType = 
  | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | 'rebuy' 
  | 'post-blind' | 'award-pot' | 'new-hand' | 'player-join' | 'player-leave'

export interface LogEntry {
  id: string
  timestamp: number
  handNumber: number
  playerId?: string
  actionType: LogActionType
  amount?: number
  potAfter?: number
  note?: string
}

// ─── Hand State ───────────────────────────────────────────
export interface HandState {
  handNumber: number
  dealerSeat: number
  smallBlindSeat: number
  bigBlindSeat: number
  currentBettingRound: BettingRound
  currentPlayerIndex: number   // index into players array
  pots: Pot[]
  totalPot: number             // sum of all pots for easy UI access
  isComplete: boolean
  deck: Card[]                 // remaining cards in the deck
  boardCards: Card[]           // revealed cards on the board
  showdownWinners: string[]
  lastRaiseSize: number
  revealAllCards?: boolean
}

// ─── Full Game State ──────────────────────────────────────
export interface GameState {
  id: string
  config: GameConfig
  players: Player[]
  hand: HandState | null       // null = no active hand
  handsPlayed: number
  actionLog: LogEntry[]
  createdAt: number            // Date.now()
}
