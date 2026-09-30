// Protocolo de comunicação PORTAL <-> JOGO via window.postMessage.
// O mesmo contrato é implementado do lado do jogo em /public/sdk/athg-sdk.js.
import type { AdResult } from '@/services/ads'

export const BRIDGE_VERSION = 1
export const GAME_SOURCE = 'athg-game'
export const PORTAL_SOURCE = 'athg-portal'

/** Mensagens enviadas pelo JOGO para o portal. */
export type GameMessage =
  | { type: 'GAME_READY' }
  | { type: 'GAME_STARTED' }
  | { type: 'GAME_OVER'; payload?: { score?: number } }
  | { type: 'SCORE_UPDATED'; payload: { score: number; leaderboard?: string } }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: { id: string } }
  | { type: 'REQUEST_REWARDED_AD'; requestId: string }
  | { type: 'SAVE_GAME'; requestId?: string; payload: { data: unknown; slot?: string } }
  | { type: 'LOAD_GAME'; requestId: string; payload?: { slot?: string } }
  | { type: 'OWN_EXIT_BUTTON' } // o jogo tem o próprio botão de sair: o portal esconde o X
  | { type: 'EXIT_REQUEST' } // o jogador pediu para sair pelo menu do jogo

/** Mensagens enviadas pelo PORTAL para o jogo. */
export type PortalMessage =
  | {
      type: 'PORTAL_INIT'
      payload: {
        game: string
        locale: string
        bridgeVersion: number
        features: { ads: boolean; cloudSave: boolean; achievements: boolean; leaderboards: boolean }
      }
    }
  | { type: 'REWARDED_AD_RESULT'; requestId: string; payload: AdResult }
  | { type: 'SAVE_RESULT'; requestId?: string; payload: { ok: boolean; error?: string } }
  | { type: 'LOAD_RESULT'; requestId: string; payload: { data: unknown } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }

export type GameMessageType = GameMessage['type']

export type Envelope<M> = M & { source: string; version: number }
