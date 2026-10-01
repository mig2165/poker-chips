import { useNavigate, useSearchParams } from 'react-router-dom'

const hands = [
  {
    name: 'Royal flush',
    description: 'The very best straight flush: 10 through Ace, all in the same suit.',
    example: [['A', '♠'], ['K', '♠'], ['Q', '♠'], ['J', '♠'], ['10', '♠']],
  },
  {
    name: 'Straight flush',
    description: 'Five ranks in a row, all in the same suit. An Ace can be high or low.',
    example: [['9', '♥'], ['8', '♥'], ['7', '♥'], ['6', '♥'], ['5', '♥']],
  },
  {
    name: 'Four of a kind',
    description: 'Four cards of the same rank, plus any fifth card.',
    example: [['Q', '♠'], ['Q', '♥'], ['Q', '♦'], ['Q', '♣'], ['3', '♠']],
  },
  {
    name: 'Full house',
    description: 'Three cards of one rank plus a pair of another rank.',
    example: [['J', '♠'], ['J', '♥'], ['J', '♦'], ['4', '♣'], ['4', '♠']],
  },
  {
    name: 'Flush',
    description: 'Any five cards of the same suit. They do not need to be in a row.',
    example: [['A', '♦'], ['10', '♦'], ['7', '♦'], ['4', '♦'], ['2', '♦']],
  },
  {
    name: 'Straight',
    description: 'Five ranks in a row, using more than one suit. Ace can be high or low.',
    example: [['A', '♠'], ['K', '♥'], ['Q', '♣'], ['J', '♦'], ['10', '♠']],
  },
  {
    name: 'Three of a kind',
    description: 'Three cards of the same rank, plus two other cards.',
    example: [['8', '♠'], ['8', '♥'], ['8', '♦'], ['K', '♣'], ['Q', '♠']],
  },
  {
    name: 'Two pair',
    description: 'Two different pairs, plus a fifth card called the kicker.',
    example: [['A', '♠'], ['A', '♥'], ['5', '♦'], ['5', '♣'], ['K', '♠']],
  },
  {
    name: 'One pair',
    description: 'Two cards of the same rank, plus three other cards.',
    example: [['K', '♠'], ['K', '♥'], ['A', '♦'], ['Q', '♣'], ['9', '♠']],
  },
  {
    name: 'High card',
    description: 'No matching combination. Your highest cards decide the hand.',
    example: [['A', '♠'], ['K', '♥'], ['J', '♦'], ['8', '♣'], ['3', '♠']],
  },
]

function PlayingCard({ rank, suit }: { rank: string; suit: string }) {
  const isRed = suit === '♥' || suit === '♦'
  return (
    <span
      className={`flex h-12 w-9 shrink-0 flex-col items-center justify-center rounded-md border border-slate-300 bg-white font-bold leading-none shadow-sm sm:h-14 sm:w-10 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}
      aria-label={`${rank} of ${suit === '♠' ? 'spades' : suit === '♥' ? 'hearts' : suit === '♦' ? 'diamonds' : 'clubs'}`}
    >
      <span className="text-sm sm:text-base">{rank}</span>
      <span className="mt-0.5 text-sm sm:text-base">{suit}</span>
    </span>
  )
}

export default function HandCheatsheetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnToTable = searchParams.get('return') === '/table'

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 pb-28 pt-8 text-slate-100">
      <button
        onClick={() => navigate(returnToTable ? '/table' : '/')}
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 hover:border-amber-400/60 hover:text-amber-200"
      >
        {returnToTable ? '← Back to table' : '← Back to lobby'}
      </button>

      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">Beginner guide</p>
        <h1 className="mt-2 text-3xl font-extrabold">Poker hand cheat sheet</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          In Texas Hold’em, make your best five-card hand from your two private cards and the five shared board cards.
          Hands are listed strongest to weakest.
        </p>
      </header>

      <div className="mt-6 grid gap-3">
        {hands.map((hand, index) => (
          <section key={hand.name} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-extrabold text-amber-300">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-bold">{hand.name}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{hand.description}</p>
                </div>
              </div>
              <div className="flex gap-1.5 pl-10 sm:pl-0" aria-label={`${hand.name} example`}>
                {hand.example.map(([rank, suit], cardIndex) => (
                  <PlayingCard key={`${rank}${suit}-${cardIndex}`} rank={rank} suit={suit} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <aside className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5">
        <h2 className="text-sm font-bold text-emerald-200">When players have the same kind of hand</h2>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          Compare the important ranks first—for example, a pair of Aces beats a pair of Kings. If those match,
          compare the remaining cards from highest to lowest. If every card used to make the best five-card hand
          matches, the pot is split. Suits do not break ties.
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          You can use any combination of your two private cards and the five board cards—even the board alone.
        </p>
      </aside>
    </main>
  )
}
