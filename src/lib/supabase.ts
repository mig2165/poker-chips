import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export function hasSupabaseConfig(): boolean {
  return Boolean(supabase)
}

function authenticationErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed')) {
    return 'Please verify your email using the link we sent you before signing in.'
  }
  if (error.code?.includes('rate_limit') || error.message.toLowerCase().includes('rate limit')) {
    return 'Supabase has temporarily limited email sending for this project. Wait before trying again. For reliable sign-ups as more people join, configure a custom SMTP email provider in Supabase Auth settings.'
  }
  return error.message
}

export async function ensureAnonymousSession(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(authenticationErrorMessage(error))
}

export async function signUp(email: string, password: string, username: string): Promise<{ requiresEmailVerification: boolean }> {
  if (!supabase) throw new Error('Supabase is not configured')
  const normalizedUsername = username.trim()
  const { data: usernameTaken, error: usernameError } = await supabase.rpc('is_username_taken_by_verified_user', {
    candidate_username: normalizedUsername,
  })
  if (usernameError) throw usernameError
  if (usernameTaken) throw new Error('That username is already taken by a verified account. Choose another one.')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: normalizedUsername, display_name: normalizedUsername },
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) throw new Error(authenticationErrorMessage(error))
  if (data.user?.identities?.length === 0) {
    throw new Error('An account with that email already exists. Sign in, and if it is not verified yet, resend the verification email.')
  }
  return { requiresEmailVerification: !data.session }
}

export async function resendSignupVerification(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
  if (error) throw new Error(authenticationErrorMessage(error))
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}

export interface UserPresence {
  userId: string
  username: string
  roomCode?: string
}

export async function subscribeToUserPresence(
  presence: UserPresence,
  onUsers: (users: UserPresence[]) => void,
): Promise<RealtimeChannel | null> {
  if (!supabase) return null
  const existing = supabase.getChannels().find(item => item.topic === 'realtime:poker-chips-presence')
  if (existing) await supabase.removeChannel(existing)
  const channel = supabase.channel('poker-chips-presence', { config: { presence: { key: presence.userId } } })
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<UserPresence>()
    onUsers(Object.values(state).flat().filter(user => user.userId !== presence.userId))
  })
  await new Promise<void>((resolve, reject) => {
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        const trackStatus = await channel.track(presence)
        if (trackStatus === 'ok') resolve()
        else reject(new Error(`Presence tracking ${trackStatus}`))
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Presence channel ${status.toLowerCase().replace('_', ' ')}`))
      }
    })
  })
  return channel
}

export async function leavePresence(channel: RealtimeChannel | null): Promise<void> {
  if (channel && supabase) await supabase.removeChannel(channel)
}

export async function recordProfileGame(gameId: string, handNumber: number, netChange: number): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const { error } = await supabase.rpc('record_profile_game', {
    game_id: gameId,
    hand_number: handNumber,
    net_change: Math.round(netChange),
  })
  if (error) throw error
}
