// AnalyticsService desacoplado. Hoje: log no console em desenvolvimento.
// Para conectar GA4/Plausible/PostHog: implemente AnalyticsProvider e chame
// analytics.setProvider(...) em main.tsx. Nenhum componente muda.

export type AnalyticsEvent =
  | 'page_view'
  | 'game_card_clicked'
  | 'game_started'
  | 'game_closed'
  | 'search'
  | 'favorite_added'
  | 'favorite_removed'
  | 'share_clicked'
  | 'pass_clicked'
  | 'problem_reported'
  | 'game_event'

export type AnalyticsProps = Record<string, string | number | boolean | undefined>

export interface AnalyticsProvider {
  track: (event: AnalyticsEvent, props?: AnalyticsProps) => void
}

const devConsoleProvider: AnalyticsProvider = {
  track: (event, props) => {
    console.debug(`%c[analytics] ${event}`, 'color:#15C8FF', props ?? {})
  },
}

const noopProvider: AnalyticsProvider = { track: () => {} }

let provider: AnalyticsProvider = import.meta.env.DEV ? devConsoleProvider : noopProvider

export const analytics = {
  setProvider(next: AnalyticsProvider) {
    provider = next
  },
  track(event: AnalyticsEvent, props?: AnalyticsProps) {
    try {
      provider.track(event, props)
    } catch {
      /* analytics nunca pode quebrar a UI */
    }
  },
}
