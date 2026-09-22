import type { GameState, LogEntry, LogActionType, BettingRound, Card, Suit, Rank, Player, Pot } from './types'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const RANK_VALUE: Record<Rank, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 }

export function generateDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ rank, suit })))
}

export function getRandomInt(max: number): number {
  const range = max + 1
  const limit = 4294967296 - (4294967296 % range)
  const arr = new Uint32Array(1)
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as { crypto: Crypto }).crypto
  while (true) {
    cryptoObj.getRandomValues(arr)
    if (arr[0] < limit) return arr[0] % range
  }
}

export function secureShuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getRandomInt(i)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function assertNoDuplicateCards(cards: Card[]): void {
  const seen = new Set<string>()
  for (const card of cards) {
    const key = `${card.rank}${card.suit}`
    if (seen.has(key)) throw new Error(`Duplicate card detected: ${key}`)
    seen.add(key)
  }
}

function addLog(state: GameState, actionType: LogActionType, playerId?: string, amount?: number, note?: string): GameState {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    handNumber: state.hand ? state.hand.handNumber : state.handsPlayed + 1,
    playerId,
    actionType,
    amount,
    potAfter: state.hand?.totalPot ?? 0,
    note,
  }
  return { ...state, actionLog: [entry, ...state.actionLog] }
}

function draw(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  return { drawn: deck.slice(0, count), remaining: deck.slice(count) }
}

export function startHand(state: GameState): GameState {
  const players: Player[] = state.players.map(player => ({
    ...player,
    isActive: !player.isSittingOut && player.stack > 0,
    currentBet: 0,
    handContribution: 0,
    holeCards: [],
    hasActed: false,
  }))
  const activePlayers = players.filter(player => player.isActive)
  if (activePlayers.length < 2) return state

  let dealerSeat = state.hand ? (state.hand.dealerSeat + 1) % players.length : 0
  while (!players[dealerSeat].isActive) dealerSeat = (dealerSeat + 1) % players.length
  let sbSeat = (dealerSeat + 1) % players.length
  while (!players[sbSeat].isActive) sbSeat = (sbSeat + 1) % players.length
  let bbSeat = (sbSeat + 1) % players.length
  while (!players[bbSeat].isActive) bbSeat = (bbSeat + 1) % players.length
  if (activePlayers.length === 2) {
    sbSeat = dealerSeat
    bbSeat = (dealerSeat + 1) % players.length
    while (!players[bbSeat].isActive) bbSeat = (bbSeat + 1) % players.length
  }

  const postBlind = (seat: number, amount: number) => {
    const posted = Math.min(players[seat].stack, amount)
    players[seat].stack -= posted
    players[seat].currentBet += posted
    players[seat].handContribution += posted
    return posted
  }
  const sbAmount = state.config.useBlinds ? postBlind(sbSeat, state.config.smallBlind) : 0
  const bbAmount = state.config.useBlinds ? postBlind(bbSeat, state.config.bigBlind) : 0
  let currentPlayerIndex = state.config.useBlinds ? (bbSeat + 1) % players.length : (dealerSeat + 1) % players.length
  while (!players[currentPlayerIndex].isActive) currentPlayerIndex = (currentPlayerIndex + 1) % players.length

  let deck = secureShuffle(generateDeck())
  for (let cardIndex = 0; cardIndex < 2; cardIndex++) {
    for (const player of players) {
      if (player.isActive) {
        const dealt = draw(deck, 1)
        player.holeCards.push(dealt.drawn[0])
        deck = dealt.remaining
      }
    }
  }

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
      currentPlayerIndex,
      pots: [],
      totalPot: sbAmount + bbAmount,
      isComplete: false,
      deck,
      boardCards: [],
      showdownWinners: [],
      lastRaiseSize: state.config.minimumBet,
      revealAllCards: false,
    },
  }
  newState = addLog(newState, 'new-hand', undefined, undefined, `Hand #${newState.handsPlayed} started; hole cards dealt`)
  newState = addLog(newState, 'post-blind', players[sbSeat].id, sbAmount, 'Small Blind')
  return addLog(newState, 'post-blind', players[bbSeat].id, bbAmount, 'Big Blind')
}

export function handleAction(state: GameState, playerId: string, actionType: LogActionType, amount = 0): GameState {
  if (!state.hand || state.hand.isComplete) return state
  const hand = { ...state.hand }
  const pIndex = state.players.findIndex(player => player.id === playerId)
  if (pIndex !== hand.currentPlayerIndex) return state
  const players = state.players.map(player => ({ ...player, holeCards: [...player.holeCards] }))
  const player = players[pIndex]
  const highestBet = Math.max(...players.map(item => item.currentBet))
  const callAmount = highestBet - player.currentBet
  if (!player.isActive || player.stack <= 0) return state

  let totalPot = state.hand.totalPot
  const commit = (requested: number) => {
    const actual = Math.min(player.stack, Math.max(0, requested))
    player.stack -= actual
    player.currentBet += actual
    player.handContribution += actual
    totalPot += actual
    return actual
  }

  switch (actionType) {
    case 'fold':
      player.isActive = false
      player.hasActed = true
      break
    case 'check':
      if (callAmount !== 0) return state
      player.hasActed = true
      break
    case 'call':
      if (callAmount <= 0) return state
      amount = commit(callAmount)
      player.hasActed = true
      break
    case 'bet':
    case 'raise': {
      const target = Math.floor(amount)
      const minimumTarget = highestBet === 0 ? hand.lastRaiseSize : highestBet + hand.lastRaiseSize
      if (target <= highestBet || target <= player.currentBet || target < minimumTarget) return state
      const actual = commit(target - player.currentBet)
      if (actual <= 0) return state
      const raiseSize = player.currentBet - highestBet
      hand.lastRaiseSize = Math.max(hand.lastRaiseSize, raiseSize)
      players.forEach(other => {
        if (other.id !== player.id && other.isActive && other.stack > 0) other.hasActed = false
      })
      player.hasActed = true
      amount = actual
      break
    }
    case 'all-in': {
      amount = commit(player.stack)
      const raised = player.currentBet > highestBet
      player.hasActed = true
      if (raised) {
        hand.lastRaiseSize = Math.max(hand.lastRaiseSize, player.currentBet - highestBet)
        players.forEach(other => {
          if (other.id !== player.id && other.isActive && other.stack > 0) other.hasActed = false
        })
      }
      break
    }
    default:
      return state
  }

  let nextState: GameState = { ...state, players, hand: { ...hand, totalPot } }
  nextState = addLog(nextState, actionType, player.id, amount)
  return advanceTurnOrRound(nextState)
}

type HandScore = { rank: number; values: number[]; description: string }

export interface BotDecision {
  actionType: LogActionType
  amount?: number
  strength: number
  reason: string
}

function scoreFive(cards: Card[]): HandScore {
  const values = cards.map(card => RANK_VALUE[card.rank]).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const suits = new Set(cards.map(card => card.suit))
  const unique = [...new Set(values)]
  const straightHigh = unique.length === 5 && (unique[0] - unique[4] === 4 ? unique[0] : unique.join(',') === '14,5,4,3,2' ? 5 : 0)
  if (straightHigh && suits.size === 1) return { rank: 8, values: [straightHigh], description: 'Straight flush' }
  if (groups[0][1] === 4) return { rank: 7, values: [groups[0][0], groups[1][0]], description: 'Four of a kind' }
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: 6, values: [groups[0][0], groups[1][0]], description: 'Full house' }
  if (suits.size === 1) return { rank: 5, values, description: 'Flush' }
  if (straightHigh) return { rank: 4, values: [straightHigh], description: 'Straight' }
  if (groups[0][1] === 3) return { rank: 3, values: [groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)], description: 'Three of a kind' }
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank: 2, values: [groups[0][0], groups[1][0], groups[2][0]], description: 'Two pair' }
  if (groups[0][1] === 2) return { rank: 1, values: [groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)], description: 'Pair' }
  return { rank: 0, values, description: 'High card' }
}

function compareScores(a: HandScore, b: HandScore): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    if ((a.values[i] ?? 0) !== (b.values[i] ?? 0)) return (a.values[i] ?? 0) - (b.values[i] ?? 0)
  }
  return 0
}

function combinations(cards: Card[], size: number): Card[][] {
  if (size === 0) return [[]]
  if (cards.length < size) return []
  const result: Card[][] = []
  for (let i = 0; i <= cards.length - size; i++) {
    for (const rest of combinations(cards.slice(i + 1), size - 1)) result.push([cards[i], ...rest])
  }
  return result
}

function bestHand(cards: Card[]): HandScore {
  return combinations(cards, 5).reduce((best, five) => {
    const score = scoreFive(five)
    return compareScores(score, best) > 0 ? score : best
  }, { rank: -1, values: [] as number[], description: 'No hand' })
}

function preflopStrength(player: Player): number {
  const [first, second] = player.holeCards
  if (!first || !second) return 0.2
  const high = Math.max(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const low = Math.min(RANK_VALUE[first.rank], RANK_VALUE[second.rank])
  const pairBonus = first.rank === second.rank ? 0.3 + high / 100 : 0
  const suitedBonus = first.suit === second.suit ? 0.08 : 0
  const connectedBonus = high - low <= 2 ? 0.06 : 0
  return Math.min(0.95, high / 20 + low / 35 + pairBonus + suitedBonus + connectedBonus)
}

function drawStrength(player: Player, boardCards: Card[]): number {
  const cards = [...player.holeCards, ...boardCards]
  const ranks = new Set(cards.map(card => RANK_VALUE[card.rank]))
  let straightDraw = 0
  for (let low = 2; low <= 10; low++) {
    const count = [low, low + 1, low + 2, low + 3, low + 4].filter(rank => ranks.has(rank)).length
    if (count >= 4) straightDraw = Math.max(straightDraw, 0.13)
  }
  const suitCounts = new Map<Suit, number>()
  cards.forEach(card => suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1))
  const flushDraw = [...suitCounts.values()].some(count => count >= 4) ? 0.16 : 0
  return straightDraw + flushDraw
}

export function decideBotAction(state: GameState, playerId: string): BotDecision {
  if (!state.hand) return { actionType: 'check', strength: 0, reason: 'No active hand' }
  const player = state.players.find(item => item.id === playerId)
  if (!player) return { actionType: 'check', strength: 0, reason: 'Player not found' }
  const highestBet = Math.max(...state.players.map(item => item.currentBet))
  const callAmount = Math.max(0, highestBet - player.currentBet)
  const potOdds = callAmount / Math.max(1, state.hand.totalPot + callAmount)
  const madeHand = state.hand.currentBettingRound === 'preflop'
    ? 0
    : bestHand([...player.holeCards, ...state.hand.boardCards]).rank / 8
  const strength = Math.min(1, Math.max(preflopStrength(player), madeHand + drawStrength(player, state.hand.boardCards)))
  const pressure = player.stack > 0 ? callAmount / player.stack : 1
  const canRaise = player.stack > callAmount + state.hand.lastRaiseSize

  if (callAmount > 0 && strength < Math.max(0.28, potOdds + 0.12) && pressure > 0.18) {
    return { actionType: 'fold', strength, reason: 'Weak hand for the price' }
  }
  if (canRaise && strength >= 0.78) {
    const target = Math.min(player.currentBet + player.stack, Math.max(highestBet + state.hand.lastRaiseSize, Math.floor(state.hand.totalPot * 0.65) + highestBet))
    return { actionType: highestBet === 0 ? 'bet' : 'raise', amount: target, strength, reason: 'Strong made hand or premium starting cards' }
  }
  if (callAmount > 0) {
    if (callAmount >= player.stack) return { actionType: 'all-in', strength, reason: 'Calling uses the remaining stack' }
    return { actionType: 'call', strength, reason: strength >= 0.55 ? 'Pot odds support continuing' : 'Small price to continue with drawing equity' }
  }
  if (canRaise && strength >= 0.6) {
    const target = Math.min(player.currentBet + player.stack, Math.max(state.hand.lastRaiseSize, Math.floor(state.hand.totalPot * 0.5)))
    return { actionType: 'bet', amount: Math.max(1, target), strength, reason: 'Value bet with a strong range' }
  }
  return { actionType: 'check', strength, reason: strength >= 0.4 ? 'Control the pot with marginal equity' : 'Take the free card' }
}

function buildPots(players: Player[]): Pot[] {
  const levels = [...new Set(players.map(player => player.handContribution).filter(Boolean))].sort((a, b) => a - b)
  const pots: Pot[] = []
  let previous = 0
  for (const level of levels) {
    const contributors = players.filter(player => player.handContribution >= level)
    const amount = (level - previous) * contributors.length
    const eligiblePlayerIds = contributors.filter(player => player.isActive).map(player => player.id)
    if (amount > 0) pots.push({ amount, eligiblePlayerIds })
    previous = level
  }
  return pots
}

function completeHand(state: GameState, boardCards: Card[]): GameState {
  if (!state.hand) return state
  const players = state.players
  const pots = buildPots(players)
  const active = players.filter(player => player.isActive)
  pots.forEach(pot => {
    if (active.length === 1) {
      pot.winnerIds = pot.eligiblePlayerIds.includes(active[0].id) ? [active[0].id] : []
      return
    }
    const eligible = players.filter(player => pot.eligiblePlayerIds.includes(player.id))
    if (eligible.length === 0) {
      pot.winnerIds = []
      return
    }
    const scores = eligible.map(player => ({ id: player.id, score: bestHand([...player.holeCards, ...boardCards]) }))
    const top = scores.reduce((best, item) => compareScores(item.score, best.score) > 0 ? item : best, scores[0])
    pot.winnerIds = scores.filter(item => compareScores(item.score, top.score) === 0).map(item => item.id)
    pot.winningHand = top.score.description
  })
  const showdownWinners = [...new Set(pots.flatMap(pot => pot.winnerIds ?? []))]
  return { ...state, hand: { ...state.hand, boardCards, deck: [], pots, showdownWinners, isComplete: true, currentPlayerIndex: -1 } }
}

function advanceTurnOrRound(state: GameState): GameState {
  if (!state.hand) return state
  const activePlayers = state.players.filter(player => player.isActive)
  if (activePlayers.length === 1) {
    const needed = 5 - state.hand.boardCards.length
    const dealt = draw(state.hand.deck, needed)
    const boardCards = state.hand.boardCards.concat(dealt.drawn)
    assertNoDuplicateCards(boardCards)
    return completeHand({ ...state, hand: { ...state.hand, deck: dealt.remaining } }, boardCards)
  }

  const highestBet = Math.max(...state.players.map(player => player.currentBet))
  const roundOver = activePlayers.every(player => player.stack === 0 || (player.hasActed && player.currentBet === highestBet))
  if (!roundOver) {
    let next = (state.hand.currentPlayerIndex + 1) % state.players.length
    while (!state.players[next].isActive || state.players[next].stack === 0 || (state.players[next].hasActed && state.players[next].currentBet === highestBet)) next = (next + 1) % state.players.length
    return { ...state, hand: { ...state.hand, currentPlayerIndex: next } }
  }

  const streets: BettingRound[] = ['preflop', 'flop', 'turn', 'river']
  const currentIndex = streets.indexOf(state.hand.currentBettingRound)
  const activeWithChips = activePlayers.filter(player => player.stack > 0)
  if (currentIndex === 3 || activeWithChips.length <= 1) {
    const deck = [...state.hand.deck]
    let boardCards = [...state.hand.boardCards]
    const needed = 5 - boardCards.length
    const dealt = draw(deck, needed)
    boardCards = boardCards.concat(dealt.drawn)
    assertNoDuplicateCards(boardCards)
    return completeHand({ ...state, hand: { ...state.hand, deck: dealt.remaining } }, boardCards)
  }

  const nextStreet = streets[currentIndex + 1]
  let deck = [...state.hand.deck]
  const boardCards = [...state.hand.boardCards]
  const count = nextStreet === 'flop' ? 3 : 1
  const dealt = draw(deck, count)
  deck = dealt.remaining
  const nextPlayers = state.players.map(player => ({ ...player, currentBet: 0, hasActed: player.isActive && player.stack === 0 }))
  let firstToAct = (state.hand.dealerSeat + 1) % nextPlayers.length
  while (!nextPlayers[firstToAct].isActive || nextPlayers[firstToAct].stack === 0) firstToAct = (firstToAct + 1) % nextPlayers.length
  return addLog({
    ...state,
    players: nextPlayers,
    hand: { ...state.hand, currentBettingRound: nextStreet, currentPlayerIndex: firstToAct, deck, boardCards: boardCards.concat(dealt.drawn), lastRaiseSize: state.config.minimumBet },
  }, 'new-hand', undefined, undefined, `Dealt ${nextStreet.toUpperCase()}`)
}

export function awardPot(state: GameState, winnerIds: string[] = []): GameState {
  if (!state.hand || !state.hand.isComplete) return state
  const players = state.players.map(player => ({ ...player }))
  if (state.config.mode === 'chipless' && winnerIds.length > 0) {
    const winner = players.find(player => winnerIds.includes(player.id))
    if (winner) winner.stack += state.hand.totalPot
    players.forEach(player => { player.sessionProfitLoss = player.stack - player.totalBuyIn })
    const nextState = { ...state, players, hand: null }
    return addLog(nextState, 'award-pot', winner?.id, state.hand.totalPot, `Physical pot awarded to ${winner?.name ?? 'selected player'}`)
  }
  const allowed = new Set(winnerIds.length ? winnerIds : state.hand.showdownWinners)
  for (const pot of state.hand.pots) {
    const winners = (pot.winnerIds ?? []).filter(id => allowed.size === 0 || allowed.has(id))
    if (winners.length === 0) continue
    const share = Math.floor(pot.amount / winners.length)
    let remainder = pot.amount - share * winners.length
    winners.forEach(id => {
      const player = players.find(item => item.id === id)
      if (player) {
        player.stack += share + (remainder-- > 0 ? 1 : 0)
      }
    })
  }
  players.forEach(player => { player.sessionProfitLoss = player.stack - player.totalBuyIn })
  const winnerNames = state.hand.showdownWinners.map(id => players.find(player => player.id === id)?.name).filter(Boolean).join(', ')
  return addLog({ ...state, players, hand: null }, 'award-pot', undefined, state.hand.totalPot, `Pot awarded to ${winnerNames}`)
}

export function addRebuy(state: GameState, playerId: string, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return state
  const players = state.players.map(player => ({ ...player }))
  const player = players.find(item => item.id === playerId)
  if (!player) return state
  player.stack += amount
  player.totalBuyIn += amount
  player.sessionProfitLoss = player.stack - player.totalBuyIn
  return addLog({ ...state, players }, 'rebuy', playerId, amount)
}
