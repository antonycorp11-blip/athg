import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouteError } from 'react-router'
import { Smartphone } from 'lucide-react'
import { useStudioLink } from '@/hooks/useStudioLink'
import { useSeo } from '@/hooks/useSeo'
import { rotatedVideoStyle } from '@/services/studio/video'
import { VoiceTap } from '@/services/studio/wav'
import type { CamRotation, CamToStudio, StudioScene } from '@/types/studio'

/**
 * Rosto do ATHG Gravador (app nativo do Mac, tools/athg-gravador). O app abre esta página
 * numa janela flutuante e transparente: ela recebe a câmera do iPhone (mesmo QR code do
 * estúdio), desenha o rosto e repassa ao app a voz (PCM) e os comandos do iPhone.
 * Fora do app ela não faz nada de útil.
 */
type Shape = 'wide' | 'square' | 'circle'
interface View {
  scene: StudioScene
  shape: Shape
  mirror: boolean
  rotate: CamRotation
  recording: boolean
  startedAt: number | null
}
type ToNative =
  | { type: 'room'; url: string }
  | { type: 'link'; status: string; camera: boolean }
  | { type: 'ctl'; msg: CamToStudio }
  | { type: 'pcm'; end: number; data: string }
  /** Voz crua do iPhone (sem a compressão da chamada): é a que deve ir para o voz.wav. */
  | { type: 'pcm-hq'; end: number; frame: number; rate: number; data: string }
  | { type: 'drag'; dx: number; dy: number }
  | { type: 'resize'; dy: number }

declare global {
  interface Window {
    webkit?: { messageHandlers?: { athg?: { postMessage(m: ToNative): void } } }
    athgAndroid?: { postMessage(json: string): void }
    athgFace?: { set(patch: Partial<View>): void; noise(on: boolean): void }
  }
}

const post = (m: ToNative) => {
  if (window.webkit?.messageHandlers?.athg) window.webkit.messageHandlers.athg.postMessage(m)
  else window.athgAndroid?.postMessage(JSON.stringify(m))
}

function bytesToBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
/** Erros vão para o registro do app (log.txt), que já anota as mudanças de estado do iPhone. */
const report = (where: string, e: unknown) => post({ type: 'link', status: `erro ${where}: ${e instanceof Error ? `${e.name} ${e.message}` : String(e)}`, camera: false })

/** Se a página quebrar dentro do app, avisa o registro e tenta de novo sozinha. */
export function FaceRouteError() {
  const error = useRouteError()
  useEffect(() => {
    report('página', error)
    const id = setTimeout(() => window.location.reload(), 3000)
    return () => clearTimeout(id)
  }, [error])
  return <div className="fixed inset-0 bg-[#0b1220]" />
}

function toBase64(data: Float32Array) {
  const pcm = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]))
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff
  }
  const bytes = new Uint8Array(pcm.buffer)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export default function StudioFacePage() {
  useSeo({ title: 'ATHG Gravador', description: 'ATHG Gravador', path: '/', noindex: true })
  const [view, setView] = useState<View>({ scene: 'game-face', shape: 'wide', mirror: true, rotate: 0, recording: false, startedAt: null })
  const videoRef = useRef<HTMLVideoElement>(null)
  const link = useStudioLink({
    onCtl: (msg) => post({ type: 'ctl', msg }),
    onPcm: (packet) => {
      const view = new DataView(packet)
      post({ type: 'pcm-hq', end: Date.now(), frame: view.getFloat64(0, true), rate: view.getUint32(8, true), data: bytesToBase64(new Uint8Array(packet, 12)) })
    },
  })
  const { room, status, camStream, sendCtl } = link

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    window.athgFace = {
      set: (patch) => setView((v) => ({ ...v, ...patch })),
      noise: (on) => sendCtl({ t: 'set-noise', on }),
    }
  }, [sendCtl])

  // (chaves: no WebKit o postMessage devolve uma Promise, que o React tomaria por limpeza)
  useEffect(() => {
    post({ type: 'room', url: `${window.location.origin}/cam/${room}` })
  }, [room])
  useEffect(() => {
    post({ type: 'link', status, camera: Boolean(camStream) })
  }, [status, camStream])

  // O iPhone (controle remoto) acompanha a cena e a gravação.
  useEffect(() => {
    if (status !== 'connected') return
    sendCtl({ t: 'state', scene: view.scene, recording: view.recording, startedAt: view.startedAt, screen: false, mirror: view.mirror, rotate: view.rotate })
  }, [status, sendCtl, view])

  // Rosto + voz: a voz vai em pedaços de PCM (com a hora em que cada um terminou) para o app,
  // que toca no retorno e grava o voz.wav alinhado com o vídeo.
  useEffect(() => {
    const video = videoRef.current
    if (video) video.srcObject = camStream
    if (!camStream?.getAudioTracks().length) return
    let ctx: AudioContext | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let tap: VoiceTap | null = null
    let closed = false
    try {
      ctx = new AudioContext({ sampleRate: 48_000 })
      const input = ctx.createGain()
      source = ctx.createMediaStreamSource(new MediaStream(camStream.getAudioTracks()))
      source.connect(input)
      void ctx.resume()
      void VoiceTap.create(ctx, input).then(
        (t) => {
          if (closed) return t.disconnect()
          tap = t
          t.onPcm = (_frame, data) => post({ type: 'pcm', end: Date.now(), data: toBase64(data) })
        },
        (e) => report('voz', e),
      )
    } catch (e) {
      report('voz', e)
    }
    return () => {
      closed = true
      tap?.disconnect()
      source?.disconnect()
      void ctx?.close()
    }
  }, [camStream])

  // Arrastar move a janela; a rodinha muda o tamanho (o app aplica no Mac).
  const last = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.screenX, y: e.screenY }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const l = last.current
    if (!l) return
    post({ type: 'drag', dx: e.screenX - l.x, dy: e.screenY - l.y })
    last.current = { x: e.screenX, y: e.screenY }
  }
  const onPointerUp = () => (last.current = null)

  const face = view.scene === 'face'
  const aspect = face ? window.innerWidth / Math.max(1, window.innerHeight) : view.shape === 'wide' ? 16 / 9 : 1
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={(e) => post({ type: 'resize', dy: e.deltaY })}
      className="fixed inset-0 cursor-grab touch-none select-none overflow-hidden bg-[#0b1220] active:cursor-grabbing"
      style={{ borderRadius: face ? 0 : view.shape === 'circle' ? '9999px' : '14px' }}
    >
      <video ref={videoRef} autoPlay playsInline muted className="absolute object-cover" style={rotatedVideoStyle(view.rotate, view.mirror, aspect)} />
      {!camStream && (
        <div className="grid size-full place-items-center text-subtle">
          <Smartphone size={face ? 48 : 24} aria-hidden />
        </div>
      )}
    </div>
  )
}
