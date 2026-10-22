import type { RealtimeChannel } from '@supabase/supabase-js'
import { getBackend } from '@/services/backend/client'
import type { SignalMessage } from '@/types/studio'

const EVENT = 'signal'

export const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

/** Sala aleatória (vai no QR code): só quem tem o link entra no canal. */
export function newRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface Signaling {
  send(message: SignalMessage): void
  close(): void
}

/** Canal Realtime (broadcast) usado só para trocar oferta/resposta/ICE do WebRTC. */
export async function joinSignaling(room: string, onMessage: (m: SignalMessage) => void, onReady: () => void): Promise<Signaling> {
  const db = await getBackend()
  const channel: RealtimeChannel = db.channel(`studio:${room}`, { config: { broadcast: { self: false, ack: false } } })
  channel.on('broadcast', { event: EVENT }, ({ payload }) => onMessage(payload as SignalMessage))
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onReady()
  })
  return {
    send: (message) => void channel.send({ type: 'broadcast', event: EVENT, payload: message }),
    close: () => void db.removeChannel(channel),
  }
}
