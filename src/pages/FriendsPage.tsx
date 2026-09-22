import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function FriendsPage() {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')

  async function addFriend(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (!supabase) return setMessage('Supabase is not configured')
    const { data: current } = await supabase.auth.getUser()
    if (!current.user) return setMessage('Sign in before adding friends')
    const { data: target } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle()
    if (!target) return setMessage('Player not found')
    const { error } = await supabase.from('friend_requests').insert({ sender_id: current.user.id, receiver_id: target.id })
    setMessage(error ? error.message : 'Friend request sent')
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Friends</h1>
      <p className="mt-2 text-sm text-slate-400">Add players by username so you can share room codes with them.</p>
      <form onSubmit={addFriend} className="mt-8 flex gap-2">
        <input required value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" className="min-w-0 flex-1 rounded-lg border bg-slate-900 px-3 py-3" />
        <button className="rounded-lg bg-amber-400 px-4 font-bold text-slate-950">Add</button>
      </form>
      {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
    </main>
  )
}
