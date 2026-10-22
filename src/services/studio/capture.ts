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

/**
 * Pede a captura desta aba (com o som do jogo) e limita ao elemento do palco.
 * O som da aba para de tocar direto: o jogo passa a ser ouvido pelo retorno do mixer,
 * já com o volume que vai para o vídeo (o que você ouve é o que é gravado).
 */
export async function captureStage(stage: HTMLElement, quality: StudioQuality): Promise<MediaStream> {
  const q = QUALITY[quality]
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: q.width, max: q.width }, height: { ideal: q.height, max: q.height }, frameRate: { ideal: q.fps, max: q.fps } },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: true },
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
  // Resolução travada: sem isso o Chrome baixa a resolução sozinho quando falta processador
  // (a imagem ficava abaixo de HD). Travado, ele prefere perder quadros e manter a nitidez.
  track.contentHint = 'detail'
  await track
    .applyConstraints({ width: { min: q.width, max: q.width }, height: { min: q.height, max: q.height }, frameRate: { ideal: q.fps, max: q.fps } })
    .catch(() => track.applyConstraints({ width: { ideal: q.width, max: q.width }, height: { ideal: q.height, max: q.height }, frameRate: { max: q.fps } }).catch(() => {}))
  // O Chrome só corta o som direto da aba quando a trilha de áudio da captura tem um
  // consumidor "de verdade": um gravador mudo (descartado) liga isso já na captura,
  // senão o jogo tocaria em dobro (direto + retorno) até a primeira gravação.
  const [audio] = stream.getAudioTracks()
  if (audio) {
    try {
      const keep = new MediaRecorder(new MediaStream([audio]))
      keep.ondataavailable = () => {}
      keep.start(30_000)
      audio.addEventListener('ended', () => keep.state !== 'inactive' && keep.stop())
    } catch {
      /* segue sem */
    }
  }
  return stream
}

/** Modo tela: escolhe a tela (ou janela) do Mac para mostrar no palco. */
export async function captureScreen(quality: StudioQuality): Promise<MediaStream> {
  const q = QUALITY[quality]
  return navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: q.width, max: q.width }, height: { ideal: q.height, max: q.height }, frameRate: { ideal: q.fps, max: q.fps }, displaySurface: 'monitor' },
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

/** Resolução e quadros do vídeo final. 720p 30 é o que um Mac sem aceleração de vídeo aguenta melhor. */
export const QUALITY = {
  '720p30': { width: 1280, height: 720, fps: 30, videoBitsPerSecond: 6_000_000 },
  '1080p30': { width: 1920, height: 1080, fps: 30, videoBitsPerSecond: 10_000_000 },
  '720p60': { width: 1280, height: 720, fps: 60, videoBitsPerSecond: 9_000_000 },
} as const
export type StudioQuality = keyof typeof QUALITY
export const isQuality = (v: unknown): v is StudioQuality => typeof v === 'string' && v in QUALITY

/** O Chrome está desenhando sem placa de vídeo (tudo no processador)? */
export function softwareRendering() {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    return /swiftshader|software|llvmpipe/i.test(renderer)
  } catch {
    return true
  }
}
