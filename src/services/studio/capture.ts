// Captura da própria aba recortada no palco (Region Capture). Quem monta a cena
// (jogo + rosto) é o compositor do navegador, na GPU: nada é redesenhado em JS.

declare global {
  interface CropTargetStatic {
    fromElement(el: Element): Promise<unknown>
  }
  interface Window {
    CropTarget?: CropTargetStatic
  }
  interface MediaStreamTrack {
    cropTo?(target: unknown): Promise<void>
  }
}

export function captureSupported() {
  return typeof navigator.mediaDevices?.getDisplayMedia === 'function' && typeof window.CropTarget?.fromElement === 'function' && typeof MediaRecorder !== 'undefined'
}

export type CaptureError = 'denied' | 'not-this-tab' | 'failed'

/** Pede a captura desta aba (com o som do jogo) e recorta no elemento do palco. */
export async function captureStage(stage: HTMLElement, fps: number): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: fps, max: fps } },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false },
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    systemAudio: 'exclude',
    monitorTypeSurfaces: 'exclude',
  } as DisplayMediaStreamOptions)
  const [track] = stream.getVideoTracks()
  try {
    const target = await window.CropTarget!.fromElement(stage)
    await track.cropTo!(target)
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('not-this-tab')
  }
  track.contentHint = 'motion'
  return stream
}

/** Formato de gravação: MP4/H.264 (codificador de hardware do Mac) quando o navegador tem. */
export function pickVideoMime() {
  const candidates = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export const QUALITY = {
  30: { fps: 30, videoBitsPerSecond: 6_000_000 },
  60: { fps: 60, videoBitsPerSecond: 9_000_000 },
} as const
export type StudioFps = keyof typeof QUALITY
