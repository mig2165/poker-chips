import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signOut, supabase } from '../lib/supabase'

const navItems = [
  {
    to: '/',
    label: 'Lobby',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/table',
    label: 'Table',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="22" />
        <line x1="2" y1="12" x2="8" y2="12" />
        <line x1="16" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) return

    let mounted = true
    let requestId = 0
    const loadUser = async (user: User | null) => {
      const currentRequestId = ++requestId
      if (!user || user.is_anonymous) {
        if (mounted && currentRequestId === requestId) setUsername(null)
        return
      }
      const { data: profile } = await client.from('profiles').select('username').eq('id', user.id).maybeSingle()
      if (!mounted || currentRequestId !== requestId) return
      setUsername(profile?.username ?? String(user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'Player'))
    }

    void client.auth.getSession().then(({ data }) => loadUser(data.session?.user ?? null))
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void loadUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await signOut()
    setUsername(null)
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-end px-5 pt-4">
        {username ? (
          <div className="flex items-center gap-3 text-sm">
            <NavLink to="/profile" className="font-semibold text-slate-200 hover:text-amber-300">{username}</NavLink>
            <button onClick={() => void handleSignOut()} className="text-slate-400 underline hover:text-slate-200">Log out</button>
          </div>
        ) : (
          <NavLink to="/auth" className="text-sm font-semibold text-amber-300 underline">Sign in</NavLink>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 pb-safe">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav
        id="bottom-nav"
        className="glass fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          borderColor: 'var(--border-subtle)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              id={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--text-accent)] scale-105'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`
              }
            >
              {item.icon}
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
      <footer className="fixed bottom-16 left-0 right-0 z-40 flex justify-center gap-4 text-[10px] text-slate-500 pointer-events-none">
        <NavLink className="pointer-events-auto hover:text-slate-300" to="/terms">Terms</NavLink>
        <NavLink className="pointer-events-auto hover:text-slate-300" to="/privacy">Privacy</NavLink>
      </footer>
    </div>
  )
}
