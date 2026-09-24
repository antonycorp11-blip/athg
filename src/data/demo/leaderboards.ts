// DADOS DE DEMONSTRAÇÃO — não representam jogadores reais.
// Substituídos pela API de rankings quando existirem contas ATHG.
import type { LeaderboardEntry } from '../../types/ranking.ts'

const demoPlayers = [
  ['NoturnoBR', 42],
  ['Vlad.exe', 39],
  ['AbissalZ', 37],
  ['KaijuDoPixel', 33],
  ['LunaCrit', 31],
  ['ByteDaMadrugada', 28],
  ['Coagulus', 26],
  ['MergulhoSeco', 22],
  ['SrUpgrade', 19],
  ['PixelSemSono', 15],
] as const

function build(seed: number, top: number, decay: number): LeaderboardEntry[] {
  const rotated = [...demoPlayers.slice(seed), ...demoPlayers.slice(0, seed)]
  return rotated.map(([username, level], i) => ({
    rank: i + 1,
    playerId: `demo-${username.toLowerCase()}`,
    username,
    avatarSeed: username,
    level,
    score: Math.round(top * Math.pow(decay, i) / 10) * 10,
  }))
}

export const demoLeaderboards: Record<string, LeaderboardEntry[]> = {
  global: build(0, 48_200, 0.86),
  hemofazenda: build(1, 1_284_500, 0.8),
  profundio: build(3, 9_870, 0.84),
}

