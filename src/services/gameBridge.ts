import {
  BRIDGE_VERSION,
  GAME_SOURCE,
  PORTAL_SOURCE,
  type GameMessage,
  type GameMessageType,
  type PortalMessage,
} from '@/types/bridge'

type Handler<T extends GameMessageType> = (message: Extract<GameMessage, { type: T }>) => void
export type BridgeHandlers = { [T in GameMessageType]?: Handler<T> }

const KNOWN_TYPES: ReadonlySet<string> = new Set<GameMessageType>([
  'GAME_READY',
  'GAME_STARTED',
  'GAME_OVER',
  'SCORE_UPDATED',
  'ACHIEVEMENT_UNLOCKED',
  'REQUEST_REWARDED_AD',
  'SAVE_GAME',
  'LOAD_GAME',
])

function isGameMessage(data: unknown): data is GameMessage & { source: string } {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return d.source === GAME_SOURCE && typeof d.type === 'string' && KNOWN_TYPES.has(d.type)
}

/** Origem esperada para uma gameUrl (relativa = mesma origem do portal). */
export function originOf(gameUrl: string) {
  try {
    return new URL(gameUrl, window.location.href).origin
  } catch {
    return null
  }
}

export interface GameBridge {
  send: (message: PortalMessage) => void
  destroy: () => void
}

/**
 * Liga um iframe de jogo ao portal. Só aceita mensagens vindas DAQUELE iframe
 * e da origem da build — qualquer outra coisa é ignorada.
 */
export function createGameBridge(iframe: HTMLIFrameElement, gameUrl: string, handlers: BridgeHandlers): GameBridge {
  const expectedOrigin = originOf(gameUrl)

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return
    if (expectedOrigin && event.origin !== expectedOrigin) return
    if (!isGameMessage(event.data)) return
    const message = event.data
    const handler = handlers[message.type] as ((m: GameMessage) => void) | undefined
    try {
      handler?.(message)
    } catch (err) {
      console.error('[gameBridge] erro ao tratar', message.type, err)
    }
  }

  window.addEventListener('message', onMessage)

  return {
    send(message) {
      if (!iframe.contentWindow || !expectedOrigin) return
      iframe.contentWindow.postMessage({ ...message, source: PORTAL_SOURCE, version: BRIDGE_VERSION }, expectedOrigin)
    },
    destroy() {
      window.removeEventListener('message', onMessage)
    },
  }
}
