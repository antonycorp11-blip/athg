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

/** Fatia binários grandes: o Safari limita o tamanho de cada mensagem do data channel. */
export const DC_CHUNK = 16 * 1024

/** Envia respeitando o buffer do data channel (sem estourar memória em conexões lentas). */
export async function sendBinary(dc: RTCDataChannel, data: ArrayBuffer) {
  for (let i = 0; i < data.byteLength; i += DC_CHUNK) {
    while (dc.bufferedAmount > 1024 * 1024) {
      await new Promise<void>((resolve) => {
        dc.bufferedAmountLowThreshold = 256 * 1024
        dc.addEventListener('bufferedamountlow', () => resolve(), { once: true })
      })
    }
    if (dc.readyState !== 'open') return
    dc.send(data.slice(i, i + DC_CHUNK))
  }
}

/** Espera o buffer esvaziar (antes de avisar que a voz terminou). */
export async function drain(dc: RTCDataChannel) {
  while (dc.readyState === 'open' && dc.bufferedAmount > 0) await new Promise((r) => setTimeout(r, 50))
}
