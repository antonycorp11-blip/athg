// Captura da própria aba limitada ao palco. Quem monta a cena (jogo + rosto) é o
// compositor do navegador, na GPU: nada é redesenhado em JS.
// Element Capture (restrictTo) grava só o palco e o que está dentro dele: os controles
// por cima (tela cheia, mixer) ficam fora do vídeo. Sem ele, cai para o recorte (cropTo).

declare global {
  interface ElementTargetStatic {
    fromElement(el: Element): Promise<unknown>
  }
  interface Window {
    CropTarget?: ElementTargetStatic
    RestrictionTarget?: ElementTargetStatic
  }
  interface MediaStreamTrack {
    cropTo?(target: unknown): Promise<void>
    restrictTo?(target: unknown): Promise<void>
  }
}

export function captureSupported() {
  return (
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    (typeof window.RestrictionTarget?.fromElement === 'function' || typeof window.CropTarget?.fromElement === 'function') &&
    typeof MediaRecorder !== 'undefined'
  )
}

/** Controles podem ficar por cima do palco sem aparecer na gravação. */
export const overlaysHidden = () => typeof window.RestrictionTarget?.fromElement === 'function'

/** Pede a captura desta aba (com o som do jogo) e limita ao elemento do palco. */
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
    if (overlaysHidden()) await track.restrictTo!(await window.RestrictionTarget!.fromElement(stage))
    else await track.cropTo!(await window.CropTarget!.fromElement(stage))
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('not-this-tab')
  }
  track.contentHint = 'motion'
  return stream
}

/** Modo tela: escolhe a tela (ou janela) do Mac para mostrar no palco. */
export async function captureScreen(fps: number): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: fps, max: fps }, displaySurface: 'monitor' },
    audio: false,
    selfBrowserSurface: 'exclude',
    monitorTypeSurfaces: 'include',
  } as DisplayMediaStreamOptions)
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
  30: { fps: 30, videoBitsPerSecond: 8_000_000 },
  60: { fps: 60, videoBitsPerSecond: 12_000_000 },
} as const
export type StudioFps = keyof typeof QUALITY
