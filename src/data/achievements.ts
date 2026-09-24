import type { Achievement } from '../types/achievement.ts'

// Conquistas "athg" são da plataforma e avaliadas com a atividade real local.
// Conquistas de jogo são desbloqueadas pelo próprio jogo via bridge:
//   ATHG.unlockAchievement('hemofarm-first-harvest')
// Os ids abaixo são exemplos — ajuste para os eventos reais de cada jogo.
export const achievements: Achievement[] = [
  { id: 'athg-first-game', scope: 'athg', name: 'Aperta o play', description: 'Jogue seu primeiro jogo na ATHG.', icon: 'play', rarity: 'common', xp: 50 },
  { id: 'athg-explorer', scope: 'athg', name: 'Explorador', description: 'Jogue 2 jogos diferentes.', icon: 'compass', rarity: 'rare', xp: 100 },
  { id: 'athg-collector', scope: 'athg', name: 'Colecionador', description: 'Favorite 3 jogos.', icon: 'heart', rarity: 'common', xp: 50 },
  { id: 'athg-dedicated', scope: 'athg', name: 'Dedicação', description: 'Acumule 60 minutos de jogo.', icon: 'clock', rarity: 'epic', xp: 150 },

  { id: 'hemofarm-first-harvest', scope: 'hemofarm', name: 'Primeira coleta', description: 'Faça sua primeira coleta de sangue.', icon: 'droplet', rarity: 'common', xp: 25 },
  { id: 'hemofarm-expansion', scope: 'hemofarm', name: 'Sede de expansão', description: 'Expanda a fazenda pela primeira vez.', icon: 'sprout', rarity: 'rare', xp: 75 },
  { id: 'hemofarm-empire', scope: 'hemofarm', name: 'Império noturno', description: 'Mantenha 10 estruturas funcionando ao mesmo tempo.', icon: 'castle', rarity: 'epic', xp: 150 },
  { id: 'hemofarm-eternal-night', scope: 'hemofarm', name: 'Noite eterna', description: 'Um segredo guardado pelos mais antigos.', icon: 'moon', rarity: 'legendary', xp: 300, hidden: true },

  { id: 'profundio-first-dive', scope: 'profundio', name: 'Primeiro mergulho', description: 'Complete sua primeira descida.', icon: 'anchor', rarity: 'common', xp: 25 },
  { id: 'profundio-below', scope: 'profundio', name: 'Abaixo da superfície', description: 'Alcance a segunda camada.', icon: 'waves', rarity: 'rare', xp: 75 },
  { id: 'profundio-pressure', scope: 'profundio', name: 'Pressão máxima', description: 'Sobreviva à zona de alta pressão.', icon: 'gauge', rarity: 'epic', xp: 150 },
  { id: 'profundio-abyss', scope: 'profundio', name: 'O abismo', description: 'Dizem que não tem fundo.', icon: 'gem', rarity: 'legendary', xp: 300, hidden: true },
]
