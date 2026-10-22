import { useCallback, useEffect, useRef, useState } from 'react'
import { ICE_SERVERS, joinSignaling, newRoomId, type Signaling } from '@/services/studio/signaling'
import { tuneAnswer } from '@/services/studio/sdp'
import { storage } from '@/services/storage'
import type { CamToStudio, SignalMessage, StudioToCam } from '@/types/studio'

export type LinkStatus = 'starting' | 'waiting' | 'connecting' | 'connected' | 'error'

interface Handlers {
  onCtl: (m: CamToStudio) => void
  /** Voz crua do microfone do iPhone (canal "pcm"): [Float64 frame][Uint32 taxa][PCM Int16]. */
  onPcm?: (packet: ArrayBuffer) => void
}

const ROOM_KEY = 'studio-room'

/** Sala fixa deste navegador: o iPhone continua conectado ao trocar de jogo ou recarregar. */
function stableRoom() {
  const saved = storage.get<string>(ROOM_KEY, '')
  if (/^[0-9a-f]{24}$/.test(saved)) return saved
  const room = newRoomId()
  storage.set(ROOM_KEY, room)
  return room
}

/**
 * Lado do estúdio da ligação com o iPhone: abre a sala (QR code), responde à oferta
 * WebRTC da câmera e expõe o rosto + a voz ao vivo e o canal de controle.
 */
export function useStudioLink(handlers: Handlers) {
  const [room] = useState(stableRoom)
  const [status, setStatus] = useState<LinkStatus>('starting')
  const [camStream, setCamStream] = useState<MediaStream | null>(null)
  const ctlRef = useRef<RTCDataChannel | null>(null)
  const h = useRef(handlers)
  h.current = handlers

  useEffect(() => {
    let pc: RTCPeerConnection | null = null
    let signaling: Signaling | null = null
    let pendingIce: RTCIceCandidateInit[] = []
    let closed = false

    const reset = () => {
      pc?.close()
      pc = null
      ctlRef.current = null
      setCamStream(null)
    }

    const onOffer = async (sdp: string) => {
      reset()
      setStatus('connecting')
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pc = peer
      peer.onicecandidate = (e) => e.candidate && signaling?.send({ type: 'ice', from: 'studio', candidate: e.candidate.toJSON() })
      // Um stream novo a cada faixa (vídeo e voz chegam separadas): quem usa percebe a mudança.
      peer.ontrack = (e) => setCamStream(new MediaStream(e.streams[0]?.getTracks() ?? [e.track]))
      peer.onconnectionstatechange = () => {
        if (pc !== peer) return
        if (peer.connectionState === 'connected') setStatus('connected')
        // "disconnected" pode voltar sozinho (Wi-Fi oscilou): só "failed" derruba a câmera.
        if (peer.connectionState === 'disconnected') setStatus('connecting')
        if (peer.connectionState === 'failed') {
          setStatus('waiting')
          setCamStream(null)
        }
      }
      peer.ondatachannel = ({ channel }) => {
        if (channel.label === 'pcm') {
          channel.binaryType = 'arraybuffer'
          channel.onmessage = (e) => e.data instanceof ArrayBuffer && h.current.onPcm?.(e.data)
          return
        }
        if (channel.label !== 'ctl') return
        ctlRef.current = channel
        channel.onmessage = (e) => h.current.onCtl(JSON.parse(e.data as string) as CamToStudio)
      }
      await peer.setRemoteDescription({ type: 'offer', sdp })
      for (const c of pendingIce) await peer.addIceCandidate(c).catch(() => {})
      pendingIce = []
      const answer = await peer.createAnswer()
      const tuned = tuneAnswer(answer.sdp ?? '')
      await peer.setLocalDescription({ type: 'answer', sdp: tuned })
      signaling?.send({ type: 'answer', sdp: tuned })
    }

    const onMessage = (m: SignalMessage) => {
      if (m.type === 'offer') void onOffer(m.sdp).catch(() => setStatus('error'))
      if (m.type === 'ice' && m.from === 'cam') {
        if (pc?.remoteDescription) void pc.addIceCandidate(m.candidate).catch(() => {})
        else pendingIce.push(m.candidate)
      }
    }

    // Adiado um tique: o StrictMode monta/desmonta na hora, e o Supabase reaproveita
    // o canal do mesmo tópico (fechar o primeiro derrubaria o segundo).
    const timer = window.setTimeout(() => {
      joinSignaling(room, onMessage, () => {
        if (closed) return
        setStatus((s) => (s === 'starting' ? 'waiting' : s))
        signaling?.send({ type: 'studio-ready' })
      })
        .then((s) => {
          if (closed) s.close()
          else signaling = s
        })
        .catch(() => setStatus('error'))
    }, 0)

    return () => {
      closed = true
      window.clearTimeout(timer)
      reset()
      signaling?.close()
    }
  }, [room])

  const sendCtl = useCallback((m: StudioToCam) => {
    const dc = ctlRef.current
    if (dc?.readyState === 'open') dc.send(JSON.stringify(m))
  }, [])

  return { room, status, camStream, sendCtl }
}
