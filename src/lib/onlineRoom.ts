import type { RealtimeChannel } from '@supabase/supabase-js'
import type { GameState, Player } from '../engine'
import { ensureAnonymousSession, supabase } from './supabase'

type PublicGameState = Omit<GameState, 'players'> & {
  players: Array<Omit<Player, 'holeCards'> & { holeCards: Player['holeCards'] }>
}

function publicState(game: GameState, revealCards: boolean): PublicGameState {
  return {
    ...game,
    players: game.players.map(player => ({
      ...player,
      holeCards: revealCards || !player.isActive ? player.holeCards : [],
    })),
  }
}

export async function createRoom(roomCode: string, hostName: string, game: GameState): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const { error } = await supabase.from('rooms').insert({
    room_code: roomCode,
    host_name: hostName,
    host_id: (await supabase.auth.getUser()).data.user?.id,
    is_public: game.config.isPublic ?? false,
    game_state: publicState(game, false),
  })
  if (error) throw error
}

export interface PublicRoom {
  roomCode: string
  hostName: string
  playerCount: number
  maxPlayers: number
  isPublic: boolean
}

export async function listPublicRooms(): Promise<PublicRoom[]> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('rooms').select('room_code, host_name, is_public, game_state').eq('is_public', true).order('updated_at', { ascending: false }).limit(20)
  if (error) throw error
  return (data ?? []).map(room => {
    const game = room.game_state as GameState
    return {
      roomCode: room.room_code,
      hostName: room.host_name,
      playerCount: game.players?.length ?? 0,
      maxPlayers: game.config?.maxPlayers ?? 7,
      isPublic: room.is_public,
    }
  })
}

export async function requestRoomJoin(roomCode: string, requesterName: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Sign in or continue as a guest to request a seat')
  const { error } = await supabase.from('room_join_requests').upsert({
    room_code: roomCode,
    requester_id: user.id,
    requester_name: requesterName.trim() || 'Guest',
    status: 'pending',
  }, { onConflict: 'room_code,requester_id' })
  if (error) throw error
}

export async function listRoomJoinRequests(roomCode: string): Promise<Array<{ id: string; requesterName: string }>> {
  if (!supabase) return []
  const { data, error } = await supabase.from('room_join_requests').select('id, requester_name').eq('room_code', roomCode).eq('status', 'pending')
  if (error) throw error
  return (data ?? []).map(request => ({ id: request.id, requesterName: request.requester_name }))
}

export async function respondToRoomJoinRequest(id: string, status: 'approved' | 'declined'): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('room_join_requests').update({ status }).eq('id', id)
  if (error) throw error
}

export async function getApprovedRoomRequest(roomCode: string): Promise<boolean> {
  if (!supabase) return false
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false
  const { data, error } = await supabase.from('room_join_requests').select('id').eq('room_code', roomCode).eq('requester_id', user.id).eq('status', 'approved').maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function sendRoomChat(roomCode: string, senderName: string, message: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const user = (await supabase.auth.getUser()).data.user
  const { error } = await supabase.from('room_messages').insert({ room_code: roomCode, sender_id: user?.id, sender_name: senderName, message: message.trim() })
  if (error) throw error
}

export function subscribeToRoomChat(roomCode: string, onMessage: (message: { senderName: string; message: string }) => void): RealtimeChannel | null {
  if (!supabase) return null
  return supabase.channel(`room-chat:${roomCode}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_code=eq.${roomCode}` }, payload => {
      const row = payload.new as { sender_name?: string; message?: string }
      if (row.sender_name && row.message) onMessage({ senderName: row.sender_name, message: row.message })
    })
    .subscribe()
}

export async function savePrivateCards(roomCode: string, player: Player): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const { error } = await supabase.from('room_players').upsert({
    room_code: roomCode,
    player_id: player.id,
    player_name: player.name,
    hole_cards: player.holeCards,
  }, { onConflict: 'room_code,player_id' })
  if (error) throw error
}

export async function loadPrivateCards(roomCode: string, playerId: string): Promise<Player['holeCards']> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const { data, error } = await supabase.from('room_players').select('hole_cards').eq('room_code', roomCode).eq('player_id', playerId).maybeSingle()
  if (error) throw error
  return (data?.hole_cards as Player['holeCards'] | undefined) ?? []
}

export async function loadRoom(roomCode: string): Promise<GameState | null> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('rooms').select('game_state').eq('room_code', roomCode).maybeSingle()
  if (error) throw error
  return (data?.game_state as GameState | undefined) ?? null
}

export async function publishRoom(roomCode: string, game: GameState, revealCards = false): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('rooms').update({
    game_state: publicState(game, revealCards),
    updated_at: new Date().toISOString(),
  }).eq('room_code', roomCode)
  if (error) throw error
}

export function subscribeToRoom(roomCode: string, onGame: (game: GameState) => void): RealtimeChannel | null {
  if (!supabase) return null
  return supabase.channel(`room:${roomCode}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `room_code=eq.${roomCode}`,
    }, payload => {
      const game = (payload.new as { game_state?: GameState }).game_state
      if (game) onGame(game)
    })
    .subscribe()
}

export async function leaveRoom(channel: RealtimeChannel | null): Promise<void> {
  if (channel && supabase) await supabase.removeChannel(channel)
}
