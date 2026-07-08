import type { GameState, LogEntry, LogActionType, BettingRound, Card, Suit, Rank } from './types'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

export function generateDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function getRandomInt(max: number): number {
  const range = max + 1
  const limit = 4294967296 - (4294967296 % range)
  const arr = new Uint32Array(1)
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto
  
  while (true) {
    cryptoObj.getRandomValues(arr)
    if (arr[0] < limit) {
      return arr[0] % range
    }
  }
}

export function secureShuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getRandomInt(i)
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

export function assertNoDuplicateCards(boardCards: Card[]): void {
  const seen = new Set<string>()
  for (const card of boardCards) {
    const key = `${card.rank}${card.suit}`
    if (seen.has(key)) {
      throw new Error(`Duplicate card detected: ${key}`)
    }
    seen.add(key)
  }
}

// Helper to add a log entry
function addLog(state: GameState, actionType: LogActionType, playerId?: string, amount?: number, note?: string): GameState {
  const newEntry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    handNumber: state.hand ? state.hand.handNumber : state.handsPlayed + 1,
    playerId,
    actionType,
    amount,
    potAfter: state.hand ? state.hand.totalPot : 0,
    note,
  }
  return { ...state, actionLog: [newEntry, ...state.actionLog] }
}

export function startHand(state: GameState): GameState {
  const players = [...state.players]
  const activePlayers = players.filter((p) => !p.isSittingOut && p.stack > 0)

  if (activePlayers.length < 2) {
    return state // Cannot start with < 2 players
  }

  // Reset player hand states
  players.forEach((p) => {
    p.isActive = !p.isSittingOut && p.stack > 0
    p.currentBet = 0
    p.hasActed = false
  })

  // Advance dealer button
  let dealerSeat = 0
  if (state.hand) {
    dealerSeat = (state.hand.dealerSeat + 1) % players.length
    while (!players[dealerSeat].isActive) {
      dealerSeat = (dealerSeat + 1) % players.length
    }
  }

  // Determine blinds
  let sbSeat = (dealerSeat + 1) % players.length
  while (!players[sbSeat].isActive) sbSeat = (sbSeat + 1) % players.length

  let bbSeat = (sbSeat + 1) % players.length
  while (!players[bbSeat].isActive) bbSeat = (bbSeat + 1) % players.length

  // Heads up rule: Dealer is Small Blind
  if (activePlayers.length === 2) {
    sbSeat = dealerSeat
    bbSeat = (dealerSeat + 1) % players.length
    while (!players[bbSeat].isActive) bbSeat = (bbSeat + 1) % players.length
  }

  // Post Blinds (Fixed 1 / 2)
  const postBlind = (seat: number, amount: number) => {
    const p = players[seat]
    const actual = Math.min(p.stack, amount)
    p.stack -= actual
    p.currentBet += actual
    return actual
  }

  const sbAmount = postBlind(sbSeat, 1)
  const bbAmount = postBlind(bbSeat, 2)

  // Determine UTG (Under the Gun - first to act preflop)
  let utgSeat = (bbSeat + 1) % players.length
  while (!players[utgSeat].isActive) utgSeat = (utgSeat + 1) % players.length

  const deck = secureShuffle(generateDeck())

  let newState: GameState = {
    ...state,
    players,
    handsPlayed: state.handsPlayed + 1,
    hand: {
      handNumber: state.handsPlayed + 1,
      dealerSeat,
      smallBlindSeat: sbSeat,
      bigBlindSeat: bbSeat,
      currentBettingRound: 'preflop',
      currentPlayerIndex: utgSeat,
      pots: [],
      totalPot: sbAmount + bbAmount,
      isComplete: false,
      deck,
      boardCards: [],
    },
  }

  newState = addLog(newState, 'new-hand', undefined, undefined, `Hand #${newState.handsPlayed} started`)
  newState = addLog(newState, 'post-blind', players[sbSeat].id, sbAmount, 'Small Blind')
  newState = addLog(newState, 'post-blind', players[bbSeat].id, bbAmount, 'Big Blind')

  return newState
}

export function handleAction(state: GameState, playerId: string, actionType: LogActionType, amount: number = 0): GameState {
  if (!state.hand || state.hand.isComplete) return state
  
  const players = [...state.players]
  const pIndex = players.findIndex((p) => p.id === playerId)
  if (pIndex !== state.hand.currentPlayerIndex) return state // Not their turn
  
  const p = players[pIndex]
  let totalPot = state.hand.totalPot

  // Calculate highest bet currently on the table
  const highestBet = Math.max(...players.map((x) => x.currentBet))
  const callAmount = highestBet - p.currentBet

  switch (actionType) {
    case 'fold':
      p.isActive = false
      p.hasActed = true
      break

    case 'check':
      p.hasActed = true
      break

    case 'call': {
      const actualCall = Math.min(p.stack, callAmount)
      p.stack -= actualCall
      p.currentBet += actualCall
      totalPot += actualCall
      p.hasActed = true
      amount = actualCall
      break
    }

    case 'bet':
    case 'raise': {
      // amount here is the TOTAL amount the player wants to commit this round
      // e.g. if highestBet is 2, and they raise to 6, amount=6.
      // They might have already bet 2, so they add 4.
      const additional = amount - p.currentBet
      const actual = Math.min(p.stack, additional)
      p.stack -= actual
      p.currentBet += actual
      totalPot += actual
      p.hasActed = true
      
      // Since it's a raise, reset hasActed for everyone else still in
      players.forEach(other => {
        if (other.id !== p.id && other.isActive && other.stack > 0) {
          other.hasActed = false
        }
      })
      break
    }

    case 'all-in': {
      const allInAmt = p.stack
      p.stack -= allInAmt
      p.currentBet += allInAmt
      totalPot += allInAmt
      p.hasActed = true
      
      // If their all-in is a raise, reopen betting for others
      if (p.currentBet > highestBet) {
        players.forEach(other => {
          if (other.id !== p.id && other.isActive && other.stack > 0) {
            other.hasActed = false
          }
        })
      }
      amount = allInAmt
      break
    }
  }

  let nextState: GameState = {
    ...state,
    players,
    hand: { ...state.hand, totalPot },
  }

  nextState = addLog(nextState, actionType, p.id, amount)
  return advanceTurnOrRound(nextState)
}

function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  return {
    drawn: deck.slice(0, count),
    remaining: deck.slice(count)
  }
}

function advanceTurnOrRound(state: GameState): GameState {
  if (!state.hand) return state

  const players = state.players
  const activePlayers = players.filter(p => p.isActive)
  
  // Only 1 player left? Hand over.
  if (activePlayers.length === 1) {
    return {
      ...state,
      hand: { ...state.hand, isComplete: true, currentPlayerIndex: -1 }
    }
  }

  // Check if betting round is over
  // Round is over if all active players who have chips remaining have acted AND matched the highest bet
  const highestBet = Math.max(...players.map(p => p.currentBet))
  const isRoundOver = activePlayers.every(p => 
    p.stack === 0 || (p.hasActed && p.currentBet === highestBet)
  )

  if (isRoundOver) {
    // Advance street
    const streets: BettingRound[] = ['preflop', 'flop', 'turn', 'river']
    const currentIndex = streets.indexOf(state.hand.currentBettingRound)
    
    // Check if everyone is all-in (no more action possible on future streets)
    const activeWithChips = activePlayers.filter(p => p.stack > 0)
    
    if (currentIndex === 3 || activeWithChips.length <= 1) {
      // Hand over (Showdown)
      let deck = [...state.hand.deck]
      let boardCards = [...state.hand.boardCards]
      const cardsNeeded = 5 - boardCards.length
      if (cardsNeeded > 0) {
        const { drawn, remaining } = drawCards(deck, cardsNeeded)
        boardCards = boardCards.concat(drawn)
        deck = remaining
      }
      assertNoDuplicateCards(boardCards)

      return {
        ...state,
        hand: {
          ...state.hand,
          deck,
          boardCards,
          isComplete: true,
          currentPlayerIndex: -1
        }
      }
    } else {
      // Next street
      const nextStreet = streets[currentIndex + 1]
      
      // Reset bets & hasActed
      players.forEach(p => {
        p.currentBet = 0
        if (p.isActive && p.stack > 0) p.hasActed = false
      })

      // Action starts left of dealer
      let firstToAct = (state.hand.dealerSeat + 1) % players.length
      while (!players[firstToAct].isActive || players[firstToAct].stack === 0) {
        firstToAct = (firstToAct + 1) % players.length
      }

      let deck = [...state.hand.deck]
      let boardCards = [...state.hand.boardCards]
      let cardsToDeal = 0
      if (nextStreet === 'flop') cardsToDeal = 3
      else if (nextStreet === 'turn') cardsToDeal = 1
      else if (nextStreet === 'river') cardsToDeal = 1

      const { drawn, remaining } = drawCards(deck, cardsToDeal)
      boardCards = boardCards.concat(drawn)
      deck = remaining

      assertNoDuplicateCards(boardCards)

      let newState = {
        ...state,
        players,
        hand: {
          ...state.hand,
          currentBettingRound: nextStreet,
          currentPlayerIndex: firstToAct,
          deck,
          boardCards
        }
      }
      return addLog(newState, 'new-hand', undefined, undefined, `Dealt ${nextStreet.toUpperCase()}`)
    }
  } else {
    // Just move to next active player who hasn't acted or needs to call
    let nextIdx = (state.hand.currentPlayerIndex + 1) % players.length
    while (
      !players[nextIdx].isActive || 
      players[nextIdx].stack === 0 || 
      (players[nextIdx].hasActed && players[nextIdx].currentBet === highestBet)
    ) {
      nextIdx = (nextIdx + 1) % players.length
    }

    return {
      ...state,
      hand: { ...state.hand, currentPlayerIndex: nextIdx }
    }
  }
}

export function awardPot(state: GameState, winnerIds: string[]): GameState {
  if (!state.hand || winnerIds.length === 0) return state

  const players = [...state.players]
  const splitAmount = Math.floor(state.hand.totalPot / winnerIds.length)

  winnerIds.forEach(wid => {
    const p = players.find(x => x.id === wid)
    if (p) p.stack += splitAmount
  })

  // Recalculate profit/loss
  players.forEach(p => {
    p.sessionProfitLoss = p.stack - p.totalBuyIn
  })

  let nextState: GameState = {
    ...state,
    players,
    hand: null // clear hand
  }

  nextState = addLog(nextState, 'award-pot', undefined, state.hand.totalPot, `Pot awarded to ${winnerIds.map(id => players.find(x=>x.id===id)?.name).join(', ')}`)
  return nextState
}

export function addRebuy(state: GameState, playerId: string, amount: number): GameState {
  const players = [...state.players]
  const p = players.find(x => x.id === playerId)
  if (!p) return state

  p.stack += amount
  p.totalBuyIn += amount
  p.sessionProfitLoss = p.stack - p.totalBuyIn

  const nextState: GameState = { ...state, players }
  return addLog(nextState, 'rebuy', playerId, amount)
}
