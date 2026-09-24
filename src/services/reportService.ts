// Reports de problemas nos jogos.
// V1: registra via analytics e guarda uma cópia local (sem backend).
// Futuro: POST /api/reports — trocar apenas `submit`.
import { analytics } from './analytics'
import { storage } from './storage'

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
    return { ok: true }
  },
}
