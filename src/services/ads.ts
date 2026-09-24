// AdService — arquitetura pronta, SEM anúncios reais ou falsos na V1.
// Quando houver um provedor (AdSense for Games, GameDistribution, etc.),
// implemente AdProvider e registre com adService.setProvider(...).

export type AdPlacement = 'home-inline' | 'game-page' | 'play-sidebar' | 'play-below'

export type AdResultStatus = 'completed' | 'skipped' | 'unavailable' | 'error'

export interface AdResult {
  status: AdResultStatus
  /** Para rewarded: true somente se o jogador assistiu até o fim. */
  rewarded?: boolean
}

export interface AdProvider {
  readonly enabled: boolean
  /** Anúncio de display em um slot da página. */
  renderDisplay?: (container: HTMLElement, placement: AdPlacement) => void
  showInterstitial: () => Promise<AdResult>
  showRewarded: () => Promise<AdResult>
}

const disabledProvider: AdProvider = {
  enabled: false,
  showInterstitial: async () => ({ status: 'unavailable' }),
  showRewarded: async () => ({ status: 'unavailable', rewarded: false }),
}

let provider: AdProvider = disabledProvider

export const adService = {
  get enabled() {
    return provider.enabled
  },
  setProvider(next: AdProvider) {
    provider = next
  },
  renderDisplay(container: HTMLElement, placement: AdPlacement) {
    provider.renderDisplay?.(container, placement)
  },
  showInterstitial: () => provider.showInterstitial(),
  /** Solicitado pelo próprio jogo via bridge (REQUEST_REWARDED_AD). */
  showRewarded: () => provider.showRewarded(),
}
