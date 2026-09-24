// Reports de problemas nos jogos: vão para o banco (painel admin) e ficam
// com uma cópia local caso o backend esteja fora.
import { analytics } from './analytics'
import { storage } from './storage'
import { remote } from './backend/remote'

export type ReportType = 'notLoading' | 'performance' | 'controls' | 'display' | 'other'

export interface ProblemReport {
  game: string
  type: ReportType
  details: string
  userAgent: string
  url: string
  createdAt: number
}

export const reportService = {
  async submit(report: Omit<ProblemReport, 'userAgent' | 'url' | 'createdAt'>) {
    const full: ProblemReport = {
      ...report,
      details: report.details.slice(0, 1000),
      userAgent: navigator.userAgent,
      url: window.location.href,
      createdAt: Date.now(),
    }
    analytics.track('problem_reported', { game: full.game, type: full.type })
    const queue = storage.get<ProblemReport[]>('reports', [])
    storage.set('reports', [full, ...queue].slice(0, 20))
    const sent = await remote.report({ game: full.game, type: full.type, details: full.details, userAgent: full.userAgent, url: full.url })
    return { ok: true, sent }
  },
}
