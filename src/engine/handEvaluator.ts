import type { Card, Rank, Suit } from './types'

const VALUES: Record<Rank, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 }

export interface EvaluatedHand {
  rank: number
  values: number[]
  name: string
  explanation: string
}

function combinations(cards: Card[], size: number): Card[][] {
  if (size === 0) return [[]]
  if (cards.length < size) return []
  const result: Card[][] = []
  for (let index = 0; index <= cards.length - size; index++) {
    for (const rest of combinations(cards.slice(index + 1), size - 1)) result.push([cards[index], ...rest])
  }
  return result
}

function scoreFive(cards: Card[]): EvaluatedHand {
  const values = cards.map(card => VALUES[card.rank]).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const suits = new Set(cards.map(card => card.suit))
  const unique = [...new Set(values)]
  const straight = unique.length === 5
    ? unique[0] - unique[4] === 4 ? unique[0] : unique.join(',') === '14,5,4,3,2' ? 5 : 0
    : 0
  if (straight && suits.size === 1) return { rank: 8, values: [straight], name: 'Straight flush', explanation: 'Five cards in sequence, all in the same suit.' }
  if (groups[0][1] === 4) return { rank: 7, values: [groups[0][0], groups[1][0]], name: 'Four of a kind', explanation: 'Four cards share the same rank.' }
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: 6, values: [groups[0][0], groups[1][0]], name: 'Full house', explanation: 'Three cards of one rank and two cards of another.' }
  if (suits.size === 1) return { rank: 5, values, name: 'Flush', explanation: 'All five cards share the same suit.' }
  if (straight) return { rank: 4, values: [straight], name: 'Straight', explanation: 'Five cards form a sequence.' }
  if (groups[0][1] === 3) return { rank: 3, values: [groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)], name: 'Three of a kind', explanation: 'Three cards share the same rank.' }
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank: 2, values: [groups[0][0], groups[1][0], groups[2][0]], name: 'Two pair', explanation: 'Two different pairs, compared by the higher pair first.' }
  if (groups[0][1] === 2) return { rank: 1, values: [groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)], name: 'Pair', explanation: 'Two cards share the same rank.' }
  return { rank: 0, values, name: 'High card', explanation: 'No made combination, so cards are compared from highest downward.' }
}

function compare(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let index = 0; index < Math.max(a.values.length, b.values.length); index++) {
    if ((a.values[index] ?? 0) !== (b.values[index] ?? 0)) return (a.values[index] ?? 0) - (b.values[index] ?? 0)
  }
  return 0
}

export function evaluateCards(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) return { rank: -1, values: [], name: 'Incomplete hand', explanation: 'Add enough board cards to make five-card poker hands.' }
  return combinations(cards, 5).reduce<EvaluatedHand>((best, five) => {
    const candidate = scoreFive(five)
    return compare(candidate, best) > 0 ? candidate : best
  }, { rank: -1, values: [], name: 'Incomplete hand', explanation: 'Add enough board cards to make five-card poker hands.' })
}

export function compareEvaluatedHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return compare(a, b)
}

export function cardFromCode(code: string): Card | null {
  const normalized = code.trim().toUpperCase()
  if (normalized.length < 2) return null
  const suit = normalized.slice(-1) as Suit
  const rankCode = normalized.slice(0, -1)
  const rank = (rankCode === '10' ? 'T' : rankCode) as Rank
  if (!['S', 'H', 'D', 'C'].includes(suit) || !['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'].includes(rank)) return null
  return { rank, suit }
}
