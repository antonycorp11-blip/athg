// Modo Gravação (estúdio): protocolo entre o estúdio (computador) e a câmera (iPhone).
// Sinalização WebRTC passa por um canal Realtime do Supabase; depois de conectados,
// os comandos vão pelo data channel "ctl" e a voz gravada no iPhone pelo canal "voice".

export type StudioScene = 'face' | 'game-face' | 'game'
export const STUDIO_SCENES: StudioScene[] = ['face', 'game-face', 'game']

/** Mensagens de sinalização (broadcast no canal studio:<sala>). */
export type SignalMessage =
  | { type: 'studio-ready' }
  | { type: 'cam-hello' }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; from: 'cam' | 'studio'; candidate: RTCIceCandidateInit }

/** Estúdio → câmera (data channel "ctl"). */
export type StudioToCam =
  | { t: 'state'; scene: StudioScene; recording: boolean; startedAt: number | null }
  | { t: 'rec-start' }
  | { t: 'rec-stop' }

/** Câmera → estúdio (data channel "ctl"). */
export type CamToStudio =
  | { t: 'scene'; scene: StudioScene }
  | { t: 'rec-toggle' }
  | { t: 'voice-start'; mime: string }
  | { t: 'voice-end' }
  | { t: 'voice-error'; message: string }
