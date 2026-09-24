import { isRouteErrorResponse, useRouteError } from 'react-router'
import { RefreshCw } from 'lucide-react'

/** Erro de rota. Chunk desatualizado após deploy = recarregar resolve. */
export function RouteError() {
  const error = useRouteError()
  console.error(error)
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Algo deu errado ao carregar esta página.'
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <img src="/brand/athg-symbol.png" alt="ATHG" className="h-10 w-auto" />
      <p className="font-display text-xl font-bold">Game over (por enquanto)</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white"
      >
        <RefreshCw size={16} aria-hidden /> Recarregar
      </button>
    </div>
  )
}
