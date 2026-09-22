import { useMemo, useState } from 'react'
import { cardFromCode, compareEvaluatedHands, evaluateCards } from '../engine/handEvaluator'
import type { Card } from '../engine'

const DEFAULT_HANDS = ['AS KH', 'QS QD', '9C 9D', '', '', '', '', '']

export default function HandDeciderPage() {
  const [handCount, setHandCount] = useState(3)
  const [hands, setHands] = useState(DEFAULT_HANDS)
  const [board, setBoard] = useState('2C 7H JD 4S 8C')

  const result = useMemo(() => {
    const boardCards = board.split(/\s+/).filter(Boolean).map(cardFromCode)
    const parsedHands = hands.slice(0, handCount).map(value => value.split(/\s+/).filter(Boolean).map(cardFromCode))
    const allCards = [...boardCards, ...parsedHands.flat()]
    const invalid = allCards.some(card => !card) || new Set(allCards.map(card => card ? `${card.rank}${card.suit}` : '')).size !== allCards.length
    if (invalid) return { error: 'Use unique cards such as AS KH. The same card cannot appear twice.' }
    const validBoard = boardCards as Card[]
    if (validBoard.length !== 5 || parsedHands.some(hand => hand.length !== 2)) return { error: 'Enter exactly two cards for every hand and five board cards.' }
    const evaluated = parsedHands.map((hand, index) => ({ index, score: evaluateCards([...hand as Card[], ...validBoard]) }))
    const best = evaluated.reduce((winner, current) => compareEvaluatedHands(current.score, winner.score) > 0 ? current : winner, evaluated[0])
    const winners = evaluated.filter(item => compareEvaluatedHands(item.score, best.score) === 0)
    return { evaluated, winners }
  }, [board, handCount, hands])

  function updateHand(index: number, value: string) {
    setHands(current => current.map((hand, handIndex) => handIndex === index ? value : hand))
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Rules sandbox</p>
      <h1 className="mt-2 text-3xl font-extrabold">Hand Decider</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-400">Enter real cards to see which Hold'em hand wins and why. This does not create a game or track chips.</p>

      <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <label className="text-sm font-bold">Number of hands
          <select value={handCount} onChange={event => setHandCount(Number(event.target.value))} className="ml-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2">
            {Array.from({ length: 6 }, (_, index) => index + 3).map(count => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
        <label className="mt-5 block text-sm font-bold">River / board cards
          <input value={board} onChange={event => setBoard(event.target.value)} placeholder="2C 7H JD 4S 8C" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-3 font-mono" />
        </label>
        <p className="mt-2 text-xs text-slate-500">Use rank plus suit: AS, KH, 10D, 7C. Enter five board cards.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: handCount }, (_, index) => (
            <label key={index} className="text-sm font-bold">Hand {index + 1}
              <input value={hands[index] ?? ''} onChange={event => updateHand(index, event.target.value)} placeholder="AS KH" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-3 font-mono" />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        {'error' in result ? <p className="text-sm text-amber-300">{result.error}</p> : (
          <>
            <h2 className="text-lg font-bold text-green-300">{result.winners.length > 1 ? 'Tie between ' : 'Winner: '}{result.winners.map(item => `Hand ${item.index + 1}`).join(', ')}</h2>
            <div className="mt-4 space-y-3">
              {result.evaluated.map(item => (
                <div key={item.index} className={`rounded-lg border p-3 ${result.winners.some(winner => winner.index === item.index) ? 'border-green-500/70 bg-green-500/10' : 'border-slate-700'}`}>
                  <div className="flex items-center justify-between"><span className="font-bold">Hand {item.index + 1}</span><span className="font-semibold text-amber-300">{item.score.name}</span></div>
                  <p className="mt-1 text-xs text-slate-400">{item.score.explanation}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
