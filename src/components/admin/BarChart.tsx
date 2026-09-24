import { useId, useMemo, useState } from 'react'

export interface BarDatum {
  label: string
  /** Rótulo longo para o tooltip e a tabela acessível. */
  fullLabel: string
  value: number
}

interface BarChartProps {
  title: string
  data: BarDatum[]
  unit?: string
  height?: number
  format?: (v: number) => string
}

const W = 600
const PAD = { top: 12, right: 8, bottom: 22, left: 36 }

/** Barras de série única: um hue, grade recessiva, tooltip por barra e tabela para leitores de tela. */
export function BarChart({ title, data, unit = '', height = 180, format = (v) => v.toLocaleString('pt-BR') }: BarChartProps) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data])
  const niceMax = useMemo(() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)))
    return Math.ceil(max / p) * p
  }, [max])

  const innerW = W - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const slot = innerW / Math.max(1, data.length)
  const gap = 2
  const barW = Math.max(1, slot - gap)
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH
  const ticks = [0, niceMax / 2, niceMax]
  const labelEvery = Math.ceil(data.length / 6)

  const barPath = (x: number, top: number, w: number) => {
    const base = PAD.top + innerH
    const r = Math.min(4, w / 2, base - top)
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`
  }

  const hovered = hover != null ? data[hover] : null

  return (
    <figure className="surface relative rounded-card p-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="mb-2 text-sm font-semibold">
        {title}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.07)" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-subtle text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + gap / 2
          const top = y(d.value)
          return (
            <g key={d.fullLabel}>
              {d.value > 0 && (
                <path d={barPath(x, top, barW)} fill="#1677FF" opacity={hover == null || hover === i ? 1 : 0.45} />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-subtle text-[10px]">
                  {d.label}
                </text>
              )}
              {/* Área de hover maior que a barra */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          )
        })}
      </svg>
      {hovered && hover != null && (
        <div
          className="pointer-events-none absolute top-10 z-10 -translate-x-1/2 rounded-md border border-line-strong bg-[#0d1626] px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <p className="text-muted">{hovered.fullLabel}</p>
          <p className="font-semibold text-fg">
            {format(hovered.value)} {unit}
          </p>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.fullLabel}>
              <th scope="row">{d.fullLabel}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
