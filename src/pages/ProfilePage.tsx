import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Profile {
  username: string
  games_played: number
  total_won: number
  total_lost: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friendCount, setFriendCount] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setMessage('Supabase is not configured')
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setMessage('Sign in to view your profile')
        return
      }
      const fallbackUsername = String(userData.user.user_metadata?.username ?? userData.user.email?.split('@')[0] ?? 'Player')
      const { data: baseProfile, error: baseError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userData.user.id)
        .maybeSingle()
      if (baseError) {
        setMessage(baseError.message)
        return
      }
      if (!baseProfile) {
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: userData.user.id, username: fallbackUsername })
          .select('username')
          .single()
        if (createError) {
          setMessage(createError.message)
          return
        }
        setProfile({ username: createdProfile.username, games_played: 0, total_won: 0, total_lost: 0 })
      } else {
        const { data: stats } = await supabase
          .from('profiles')
          .select('games_played, total_won, total_lost')
          .eq('id', userData.user.id)
          .maybeSingle()
        setProfile({
          username: baseProfile.username,
          games_played: stats?.games_played ?? 0,
          total_won: stats?.total_won ?? 0,
          total_lost: stats?.total_lost ?? 0,
        })
        if (!stats) setMessage('Profile loaded. Run the latest Supabase schema to enable game statistics.')
      }
      const { data: requests } = await supabase.from('friend_requests').select('sender_id, receiver_id').or(`sender_id.eq.${userData.user.id},receiver_id.eq.${userData.user.id}`).eq('status', 'accepted')
      setFriendCount(requests?.length ?? 0)
    })().catch(error => setMessage(error instanceof Error ? error.message : 'Could not load profile'))
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Player profile</p>
      <h1 className="mt-2 text-3xl font-extrabold">{profile?.username ?? 'Your profile'}</h1>
      {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
      {profile && (
        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Stat label="Games" value={profile.games_played} />
          <Stat label="Won" value={`$${profile.total_won}`} />
          <Stat label="Lost" value={`$${profile.total_lost}`} />
          <Stat label="Friends" value={friendCount} />
        </div>
      )}
      <p className="mt-8 text-sm text-slate-400">Stats track play-money games only. They are not real-money balances.</p>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-slate-700 bg-slate-900 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-amber-300">{value}</p></div>
}
