import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { leavePresence, subscribeToUserPresence, supabase, type UserPresence } from '../lib/supabase'

interface FriendProfile {
  id: string
  username: string
}

interface PendingRequest {
  id: string
  senderId: string
  username: string
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [notice, setNotice] = useState('')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const previousOnline = useRef(new Set<string>())

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

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    void (async () => {
      if (!supabase) return
      const { data: current } = await supabase.auth.getUser()
      if (!current.user || current.user.is_anonymous) {
        setSignedIn(false)
        return
      }
      setSignedIn(true)
      const { data: requests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${current.user.id},receiver_id.eq.${current.user.id}`)
        .eq('status', 'accepted')
      const friendIds = (requests ?? []).map(request => request.sender_id === current.user!.id ? request.receiver_id : request.sender_id)
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', friendIds)
        setFriends(profiles ?? [])
      }
      const { data: pending } = await supabase.from('friend_requests').select('id, sender_id').eq('receiver_id', current.user.id).eq('status', 'pending')
      if (pending?.length) {
        const { data: senders } = await supabase.from('profiles').select('id, username').in('id', pending.map(request => request.sender_id))
        setPendingRequests(pending.map(request => ({
          id: request.id,
          senderId: request.sender_id,
          username: senders?.find(sender => sender.id === request.sender_id)?.username ?? 'Player',
        })))
      }
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', current.user.id).maybeSingle()
      if (!profile?.username) return
      channel = await subscribeToUserPresence({ userId: current.user.id, username: profile.username }, users => {
        const friendSet = new Set(friendIds)
        const visible = users.filter(user => friendSet.has(user.userId))
        const newlyOnline = visible.find(user => !previousOnline.current.has(user.userId))
        if (newlyOnline) {
          setNotice(`${newlyOnline.username} is online${newlyOnline.roomCode ? ' and playing a game' : ''}.`)
          window.setTimeout(() => setNotice(''), 4000)
        }
        previousOnline.current = new Set(visible.map(user => user.userId))
        setOnlineUsers(visible)
      })
    })().catch(error => setMessage(error instanceof Error ? error.message : 'Could not load friends'))
    return () => { void leavePresence(channel) }
  }, [])

  async function respondToRequest(request: PendingRequest, status: 'accepted' | 'declined') {
    if (!supabase) return
    const { error } = await supabase.from('friend_requests').update({ status }).eq('id', request.id)
    if (error) {
      setMessage(error.message)
      return
    }
    setPendingRequests(current => current.filter(item => item.id !== request.id))
    if (status === 'accepted') setFriends(current => [...current, { id: request.senderId, username: request.username }])
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Friends</h1>
      <p className="mt-2 text-sm text-slate-400">Add players by username and see when friends are available to watch.</p>
      {signedIn === false && (
        <section className="mt-8 border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-300">Sign in to add friends, accept requests, and see which friends are online.</p>
          <button onClick={() => navigate('/auth')} className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Sign in</button>
        </section>
      )}
      {signedIn !== false && (
        <>
      <form onSubmit={addFriend} className="mt-8 flex gap-2">
        <input required value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" className="min-w-0 flex-1 rounded-lg border bg-slate-900 px-3 py-3" />
        <button className="rounded-lg bg-amber-400 px-4 font-bold text-slate-950">Add</button>
      </form>
      {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
      {notice && <div className="mt-5 border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200" role="status">{notice}</div>}
      {pendingRequests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Friend requests</h2>
          <div className="mt-3 space-y-2">
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center gap-3 rounded-lg border border-amber-400/30 bg-slate-900 px-3 py-3">
                <span className="flex-1 text-sm font-semibold">{request.username}</span>
                <button onClick={() => void respondToRequest(request, 'accepted')} className="border border-emerald-400/50 px-2 py-1 text-xs font-bold text-emerald-300">Accept</button>
                <button onClick={() => void respondToRequest(request, 'declined')} className="border border-slate-600 px-2 py-1 text-xs font-bold text-slate-300">Decline</button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Your friends</h2>
        <div className="mt-3 space-y-2">
          {friends.length === 0 && <p className="text-sm text-slate-500">Accepted friends will appear here.</p>}
          {friends.map(friend => {
            const presence = onlineUsers.find(user => user.userId === friend.id)
            return (
              <div key={friend.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${presence ? 'bg-emerald-400' : 'bg-slate-600'}`} aria-label={presence ? 'Online' : 'Offline'} />
                <span className="flex-1 text-sm font-semibold">{friend.username}</span>
                {presence?.roomCode && <button onClick={() => navigate(`/spectate/${presence.roomCode}`)} className="border border-emerald-400/50 px-2 py-1 text-xs font-bold text-emerald-300">Spectate</button>}
              </div>
            )
          })}
        </div>
      </section>
        </>
      )}
    </main>
  )
}
