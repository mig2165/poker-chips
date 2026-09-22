export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Poker Chips</p>
      <h1 className="mt-3 text-3xl font-extrabold">Terms and Conditions</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated September 17, 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
        <section><h2 className="text-lg font-bold text-white">Use of the service</h2><p className="mt-2">Poker Chips is a tool for tracking informal poker games. It does not process money, operate games of chance, or guarantee the accuracy of a game record.</p></section>
        <section><h2 className="text-lg font-bold text-white">Player responsibility</h2><p className="mt-2">Players are responsible for agreeing on house rules, buy-ins, blinds, payouts, and local legal requirements before playing.</p></section>
        <section><h2 className="text-lg font-bold text-white">Availability and data</h2><p className="mt-2">Online rooms depend on third-party hosting and realtime services. We do not guarantee uninterrupted availability or recovery of an abandoned room.</p></section>
        <section><h2 className="text-lg font-bold text-white">Acceptance</h2><p className="mt-2">By using the service, you agree to use it lawfully and not to abuse, disrupt, or attempt to compromise the service.</p></section>
      </div>
    </article>
  )
}
