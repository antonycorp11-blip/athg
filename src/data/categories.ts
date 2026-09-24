import type { Category } from '../types/game.ts'

// Ordem = ordem de exibição na sidebar e nos filtros.
export const categories: Category[] = [
  { id: 'incremental', label: 'Incremental', listed: true, description: 'Números subindo, automações e aquele "só mais um upgrade".' },
  { id: 'gerenciamento', label: 'Gerenciamento', listed: true, description: 'Administre, otimize e faça o império crescer.' },
  { id: 'estrategia', label: 'Estratégia', listed: true, description: 'Pense antes de agir. Ou não, e descubra o porquê.' },
  { id: 'aventura', label: 'Aventura', listed: true, description: 'Explore, descubra e vá além do mapa.' },
  { id: 'progressao', label: 'Progressão', listed: false, description: 'Evolua a cada partida.' },
  { id: 'simulacao', label: 'Simulação', listed: true, description: 'Mundos que funcionam do seu jeito.' },
  { id: 'musica', label: 'Música', listed: true, description: 'Ritmo, som e reflexo.' },
  { id: 'educacao', label: 'Educação', listed: true, description: 'Aprender jogando.' },
  { id: 'casual', label: 'Casual', listed: true, description: 'Partidas rápidas para qualquer momento.' },
  { id: 'multiplayer', label: 'Multiplayer', listed: true, description: 'Jogue com e contra outras pessoas.' },
]
