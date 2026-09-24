// Painel admin (interno, pt-BR). Acesso: contas na tabela app_admins do banco.
// Toda consulta passa por funções admin_* que checam is_admin() no servidor —
// esconder a página não é a segurança; o banco é.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Users, UserPlus, Activity, Clock, Gamepad2, Timer, Flag, RefreshCw, Search, ShieldAlert, LogIn, Smartphone, Repeat } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { auth, authStore } from '@/services/backend/auth'
import type { Db } from '@/services/backend/client'
import { gamesService } from '@/services/gamesService'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Avatar } from '@/components/ui/Avatar'
import { BarChart } from '@/components/admin/BarChart'
import { openAuthModal } from '@/components/account/authModalStore'
import { cn } from '@/utils/cn'

type Overview = {
  users_total: number
  users_registered: number
  users_new_7d: number
  dau: number
  wau: number
  mau: number
  minutes_total: number
  minutes_7d: number
  sessions_7d: number
  avg_session_minutes: number
  reports_open: number
}
type Retention = Record<'d1' | 'd7' | 'd30', { cohort: number; returned: number }>

const nf = (v: number) => v.toLocaleString('pt-BR')
const hours = (min: number) => (min >= 600 ? `${nf(Math.round(min / 60))} h` : min >= 60 ? `${(min / 60).toFixed(1).replace('.', ',')} h` : `${nf(min)} min`)
const dateBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const dateTimeBR = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const gameTitle = (slug: string) => gamesService.getBySlug(slug)?.title ?? slug

async function adminDb(): Promise<Db | null> {
  const db = await auth.sessionClient()
  if (!db) return null
  const { data } = await db.rpc('is_admin')
  auth.setAdmin(data === true)
  return data === true ? db : null
}

export default function AdminPage() {
  useSeo({ title: 'Painel admin | ATHG', description: 'Painel administrativo da ATHG.', path: '/admin', noindex: true })
  const { userId, isAnonymous, status } = useStore(authStore)
  const signedIn = Boolean(userId && !isAnonymous)
  const [refresh, setRefresh] = useState(0)
  const access = useAsync(() => adminDb(), [userId, refresh])

  useEffect(() => {
    if (status === 'idle') void auth.publicClient()
  }, [status])

  if (!signedIn && status !== 'loading' && access.status !== 'loading') {
    return (
      <div className="py-16">
        <EmptyState
          icon={LogIn}
          title="Área restrita"
          text="Entre com a conta de administrador."
          action={<Button onClick={() => openAuthModal('signin')}>Entrar</Button>}
        />
      </div>
    )
  }
  if (access.status === 'loading') return <DashboardSkeleton />
  if (!access.data) {
    return (
      <div className="py-16">
        <EmptyState icon={ShieldAlert} title="Acesso restrito" text="Esta conta não tem permissão de administrador." action={<Link to="/" className="text-sm text-brand">Voltar</Link>} />
      </div>
    )
  }
  return <Dashboard db={access.data} refresh={refresh} onRefresh={() => setRefresh((n) => n + 1)} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 py-8" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-card" />
    </div>
  )
}

function Dashboard({ db, refresh, onRefresh }: { db: Db; refresh: number; onRefresh: () => void }) {
  const data = useAsync(async () => {
    const [overview, daily, games, retention, devices, misses, reports] = await Promise.all([
      db.rpc('admin_overview'),
      db.rpc('admin_daily', { p_days: 30 }),
      db.rpc('admin_games'),
      db.rpc('admin_retention'),
      db.rpc('admin_devices'),
      db.rpc('admin_search_misses', { p_limit: 15 }),
      db.rpc('admin_reports', { p_limit: 30 }),
    ])
    const err = [overview, daily, games, retention, devices, misses, reports].find((r) => r.error)?.error
    if (err) throw err
    return {
      overview: overview.data as unknown as Overview,
      daily: daily.data ?? [],
      games: games.data ?? [],
      retention: retention.data as unknown as Retention,
      devices: devices.data ?? [],
      misses: misses.data ?? [],
      reports: reports.data ?? [],
    }
  }, [db, refresh])

  if (data.status === 'loading') return <DashboardSkeleton />
  if (data.status === 'error') {
    return <EmptyState icon={ShieldAlert} title="Erro ao carregar o painel" text={String((data.error as Error)?.message ?? data.error)} className="my-16" />
  }
  const { overview: o, daily, games, retention, devices, misses, reports } = data.data
  const guests = o.users_total - o.users_registered
  const deviceTotal = devices.reduce((s, d) => s + d.sessions, 0) || 1

  return (
    <div className="space-y-10 py-6 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-title text-2xl sm:text-3xl">Painel admin</h1>
          <p className="text-sm text-muted">Dados reais do banco · atualizado agora</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={onRefresh}>
          Atualizar
        </Button>
      </header>

      {/* KPIs */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Usuários" value={nf(o.users_total)} hint={`${nf(o.users_registered)} com conta · ${nf(guests)} convidados`} />
        <StatCard icon={UserPlus} label="Novos (7 dias)" value={nf(o.users_new_7d)} accent="cyan" />
        <StatCard icon={Activity} label="Ativos hoje · 7d · 30d" value={`${nf(o.dau)} · ${nf(o.wau)} · ${nf(o.mau)}`} accent="violet" />
        <StatCard icon={Clock} label="Tempo jogado (total)" value={hours(o.minutes_total)} hint={`${hours(o.minutes_7d)} nos últimos 7 dias`} accent="gold" />
        <StatCard icon={Gamepad2} label="Sessões (7 dias)" value={nf(o.sessions_7d)} />
        <StatCard icon={Timer} label="Sessão média (30 dias)" value={`${String(o.avg_session_minutes).replace('.', ',')} min`} accent="cyan" />
        <StatCard icon={Repeat} label="Voltaram no dia seguinte" value={pct(retention.d1)} hint={cohortHint(retention.d1)} accent="violet" />
        <StatCard icon={Flag} label="Reports abertos" value={nf(o.reports_open)} accent="gold" />
      </section>

      {/* Evolução diária */}
      <section aria-labelledby="daily" className="space-y-3">
        <SectionHeader id="daily" title="Últimos 30 dias" />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <BarChart title="Jogadores ativos por dia" unit="jogadores" data={daily.map((d) => ({ label: dateBR(d.day + 'T12:00'), fullLabel: new Date(d.day + 'T12:00').toLocaleDateString('pt-BR'), value: d.active_users }))} />
          <BarChart title="Minutos jogados por dia" unit="min" data={daily.map((d) => ({ label: dateBR(d.day + 'T12:00'), fullLabel: new Date(d.day + 'T12:00').toLocaleDateString('pt-BR'), value: d.minutes }))} />
          <BarChart title="Novos usuários por dia" unit="novos" data={daily.map((d) => ({ label: dateBR(d.day + 'T12:00'), fullLabel: new Date(d.day + 'T12:00').toLocaleDateString('pt-BR'), value: d.new_users }))} />
        </div>
      </section>

      {/* Retenção */}
      <section aria-labelledby="retention">
        <SectionHeader id="retention" title="Retenção" subtitle="Dos jogadores que começaram no período, quantos voltaram depois de N dias." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['d1', 'd7', 'd30'] as const).map((k) => (
            <div key={k} className="surface rounded-card p-4">
              <p className="text-xs text-muted">Voltaram no dia {k.slice(1)}</p>
              <p className="font-display text-2xl font-bold">{pct(retention[k])}</p>
              <p className="text-[11px] text-subtle">{cohortHint(retention[k])}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jogos */}
      <section aria-labelledby="games">
        <SectionHeader id="games" title="Jogos" />
        {games.length ? (
          <div className="surface overflow-x-auto rounded-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  {['Jogo', 'Jogadores', 'Jogadores 7d', 'Sessões', 'Tempo total', 'Sessão média', 'Favoritos'].map((h, i) => (
                    <th key={h} scope="col" className={cn('px-4 py-3 font-medium', i > 0 && 'text-right')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {games.map((g) => (
                  <tr key={g.game_slug} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold">{gameTitle(g.game_slug)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(g.players)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(g.players_7d)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(g.sessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{hours(g.minutes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{String(g.avg_session_minutes).replace('.', ',')} min</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(g.favorites)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma sessão de jogo registrada ainda.</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Dispositivos */}
        <section aria-labelledby="devices">
          <SectionHeader id="devices" title="Dispositivos (30 dias)" icon={Smartphone} />
          <ul className="surface space-y-3 rounded-card p-4">
            {devices.length ? (
              devices.map((d) => {
                const share = Math.round((d.sessions / deviceTotal) * 100)
                return (
                  <li key={d.device}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize">{d.device}</span>
                      <span className="text-muted tabular-nums">
                        {share}% · {nf(d.sessions)} sessões · {hours(d.minutes)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="text-sm text-muted">Sem dados ainda.</li>
            )}
          </ul>
        </section>

        {/* Buscas sem resultado */}
        <section aria-labelledby="misses">
          <SectionHeader id="misses" title="Buscas sem resultado" subtitle="O que o público procura e ainda não tem." icon={Search} />
          <ul className="surface divide-y divide-line rounded-card">
            {misses.length ? (
              misses.map((m) => (
                <li key={m.query} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate">“{m.query}”</span>
                  <span className="shrink-0 text-muted tabular-nums">{nf(m.times)}×</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-muted">Nenhuma busca vazia nos últimos 30 dias.</li>
            )}
          </ul>
        </section>
      </div>

      <UsersTable db={db} refresh={refresh} />
      <ReportsList db={db} reports={reports} onChanged={onRefresh} />
    </div>
  )
}

const pct = (r: { cohort: number; returned: number }) => (r.cohort ? `${Math.round((r.returned / r.cohort) * 100)}%` : '—')
const cohortHint = (r: { cohort: number; returned: number }) => (r.cohort ? `${nf(r.returned)} de ${nf(r.cohort)} jogadores` : 'Ainda sem dados suficientes')

const PAGE = 25

function UsersTable({ db, refresh }: { db: Db; refresh: number }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebouncedValue(search.trim(), 300)
  useEffect(() => setPage(0), [q])
  const users = useAsync(async () => {
    const { data, error } = await db.rpc('admin_users', { p_search: q, p_limit: PAGE, p_offset: page * PAGE })
    if (error) throw error
    return data ?? []
  }, [db, q, page, refresh])
  const total = users.status === 'success' ? (users.data[0]?.total_count ?? 0) : 0
  const pages = useMemo(() => Math.max(1, Math.ceil(total / PAGE)), [total])

  return (
    <section aria-labelledby="users">
      <SectionHeader id="users" title="Usuários" subtitle={users.status === 'success' ? `${nf(total)} encontrados` : undefined} icon={Users} />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, email ou ATHG ID…"
        aria-label="Buscar usuários"
        className="mb-3 h-10 w-full max-w-md rounded-md border border-line bg-white/[0.04] px-3 text-sm outline-none focus:border-brand/60"
      />
      <div className="surface overflow-x-auto rounded-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              {['Jogador', 'Conta', 'Entrou', 'Último acesso', 'Tempo', 'Sessões', 'Jogos', 'Nível'].map((h, i) => (
                <th key={h} scope="col" className={cn('px-4 py-3 font-medium', i > 3 && 'text-right')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.status === 'loading' ? (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ) : users.status === 'error' ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted">Erro ao carregar usuários.</td>
              </tr>
            ) : users.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted">Nenhum usuário.</td>
              </tr>
            ) : (
              users.data.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.username} seed={u.id} size="xs" />
                      <span className="font-semibold">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{u.is_anonymous ? <Badge tone="neutral">Convidado</Badge> : <span className="text-muted">{u.email}</span>}</td>
                  <td className="px-4 py-2.5 text-muted">{dateBR(u.created_at)}</td>
                  <td className="px-4 py-2.5 text-muted">{dateTimeBR(u.last_seen_at)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{hours(u.minutes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{nf(u.sessions)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{nf(u.games)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{u.level}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted">
            {page + 1} / {pages}
          </span>
          <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </section>
  )
}

const reportTypes: Record<string, string> = {
  notLoading: 'Não carrega',
  performance: 'Travando',
  controls: 'Controles',
  display: 'Tela/layout',
  other: 'Outro',
}

function ReportsList({ db, reports, onChanged }: { db: Db; reports: { id: number; username: string; game_slug: string; type: string; details: string; user_agent: string; status: string; created_at: string }[]; onChanged: () => void }) {
  const toggle = async (id: number, status: string) => {
    await db.rpc('admin_set_report_status', { p_id: id, p_status: status === 'open' ? 'resolved' : 'open' })
    onChanged()
  }
  return (
    <section aria-labelledby="reports">
      <SectionHeader id="reports" title="Problemas reportados" icon={Flag} />
      {reports.length ? (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className={cn('surface flex flex-col gap-2 rounded-card p-4 sm:flex-row sm:items-start', r.status === 'resolved' && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{gameTitle(r.game_slug)}</span>
                  <Badge tone={r.status === 'open' ? 'gold' : 'success'}>{r.status === 'open' ? 'Aberto' : 'Resolvido'}</Badge>
                  <span className="text-muted">{reportTypes[r.type] ?? r.type}</span>
                  <span className="text-subtle">· {r.username ?? 'desconhecido'} · {dateTimeBR(r.created_at)}</span>
                </div>
                {r.details && <p className="mt-1 text-sm text-fg/85">{r.details}</p>}
                {r.user_agent && <p className="mt-1 truncate text-[11px] text-subtle">{r.user_agent}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => void toggle(r.id, r.status)}>
                {r.status === 'open' ? 'Marcar resolvido' : 'Reabrir'}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum problema reportado.</p>
      )}
    </section>
  )
}
