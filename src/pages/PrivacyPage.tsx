export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Poker Chips</p>
      <h1 className="mt-3 text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated September 17, 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
        <section><h2 className="text-lg font-bold text-white">What we store</h2><p className="mt-2">Local games are held in your browser session. Online rooms store the shared table state and player records required to run the room.</p></section>
        <section><h2 className="text-lg font-bold text-white">Private cards</h2><p className="mt-2">During an online hand, hole cards are stored separately and are intended to be readable only by the player who owns them. Cards are revealed at showdown according to the game flow.</p></section>
        <section><h2 className="text-lg font-bold text-white">Third-party services</h2><p className="mt-2">Online rooms use Supabase for authentication, database storage, and realtime updates. Supabase may process technical data needed to provide those services.</p></section>
        <section><h2 className="text-lg font-bold text-white">Contact</h2><p className="mt-2">For privacy questions or deletion requests, contact the service owner through the project repository.</p></section>
      </div>
    </article>
  )
}
