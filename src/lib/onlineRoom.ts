import type { RealtimeChannel } from '@supabase/supabase-js'
import type { GameState, Player } from '../engine'
import { ensureAnonymousSession, supabase } from './supabase'

type PublicGameState = Omit<GameState, 'players'> & {
  players: Array<Omit<Player, 'holeCards'> & { holeCards: Player['holeCards'] }>
}

function publicState(game: GameState, revealCards: boolean): PublicGameState {
  return {
    ...game,
    players: game.players.map(player => ({ ...player, holeCards: revealCards ? player.holeCards : [] })),
  }
}

export async function createRoom(roomCode: string, hostName: string, game: GameState): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  await ensureAnonymousSession()
  const { error } = await supabase.from('rooms').insert({
    room_code: roomCode,
    host_name: hostName,
    game_state: publicState(game, false),
  })
  if (error) throw error
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
