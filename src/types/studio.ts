// Modo Gravação (estúdio): protocolo entre o estúdio (computador) e a câmera (iPhone).
// Sinalização WebRTC passa por um canal Realtime do Supabase; depois de conectados,
// rosto e voz vão ao vivo por WebRTC e os comandos pelo data channel "ctl".

export type StudioScene = 'face' | 'game-face' | 'game'
export const STUDIO_SCENES: StudioScene[] = ['face', 'game-face', 'game']

export type CamRotation = 0 | 90 | 180 | 270

/** Ajuste da imagem do rosto (feito no estúdio, controlável pelo iPhone). */
export interface CamTransform {
  mirror: boolean
  rotate: CamRotation
}

/** Mensagens de sinalização (broadcast no canal studio:<sala>). */
export type SignalMessage =
  | { type: 'studio-ready' }
  | { type: 'cam-hello' }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; from: 'cam' | 'studio'; candidate: RTCIceCandidateInit }

/** Estúdio → câmera (data channel "ctl"). */
export type StudioToCam =
  | ({ t: 'state'; scene: StudioScene; recording: boolean; startedAt: number | null; screen: boolean } & CamTransform)
  | { t: 'set-noise'; on: boolean }

/** Câmera → estúdio (data channel "ctl"). */
export type CamToStudio =
  | { t: 'scene'; scene: StudioScene }
  | { t: 'rec-toggle' }
  | { t: 'cam-transform'; mirror?: boolean; rotate?: CamRotation }
  /** Redução de ruído do iPhone (processamento de voz do sistema) ligada/desligada. */
  | { t: 'cam-info'; noise: boolean }
