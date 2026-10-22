import { useCallback, useEffect, useRef, useState } from 'react'
import { ICE_SERVERS, joinSignaling, newRoomId, type Signaling } from '@/services/studio/signaling'
import type { CamToStudio, SignalMessage, StudioToCam } from '@/types/studio'

export type LinkStatus = 'starting' | 'waiting' | 'connecting' | 'connected' | 'error'

export type VoiceEvent = { kind: 'start'; mime: string } | { kind: 'data'; data: ArrayBuffer } | { kind: 'end' } | { kind: 'lost' }

interface Handlers {
  onCtl: (m: CamToStudio) => void
  onVoice: (e: VoiceEvent) => void
}

/**
 * Lado do estúdio da ligação com o iPhone: abre a sala (QR code), responde à oferta
 * WebRTC da câmera e expõe o vídeo do rosto + os canais de controle e de voz.
 */
export function useStudioLink(handlers: Handlers) {
  const [room] = useState(newRoomId)
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
      peer.ontrack = (e) => setCamStream(e.streams[0] ?? new MediaStream([e.track]))
      peer.onconnectionstatechange = () => {
        if (pc !== peer) return
        if (peer.connectionState === 'connected') setStatus('connected')
        // "disconnected" pode voltar sozinho (Wi-Fi oscilou): só "failed" derruba a câmera.
        if (peer.connectionState === 'disconnected') setStatus('connecting')
        if (peer.connectionState === 'failed') {
          setStatus('waiting')
          setCamStream(null)
          h.current.onVoice({ kind: 'lost' })
        }
      }
      peer.ondatachannel = ({ channel }) => {
        channel.binaryType = 'arraybuffer'
        if (channel.label === 'ctl') {
          ctlRef.current = channel
          channel.onmessage = (e) => h.current.onCtl(JSON.parse(e.data as string) as CamToStudio)
        } else if (channel.label === 'voice') {
          channel.onmessage = (e) => {
            if (typeof e.data === 'string') {
              const m = JSON.parse(e.data) as CamToStudio
              if (m.t === 'voice-start') h.current.onVoice({ kind: 'start', mime: m.mime })
              if (m.t === 'voice-end') h.current.onVoice({ kind: 'end' })
            } else h.current.onVoice({ kind: 'data', data: e.data as ArrayBuffer })
          }
        }
      }
      await peer.setRemoteDescription({ type: 'offer', sdp })
      for (const c of pendingIce) await peer.addIceCandidate(c).catch(() => {})
      pendingIce = []
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      signaling?.send({ type: 'answer', sdp: answer.sdp ?? '' })
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
