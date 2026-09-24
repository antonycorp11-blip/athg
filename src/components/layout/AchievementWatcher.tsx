import { useEffect } from 'react'
import { achievementService } from '@/services/achievementService'
import { favoritesStore, historyStore } from '@/services/library'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/useTranslation'

/** Avalia conquistas da plataforma quando a atividade local muda e avisa o jogador. */
export function AchievementWatcher() {
  const { toast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    const check = () => {
      for (const a of achievementService.evaluatePlatform()) {
        toast(t('achievements.unlockedToast', { name: a.name }), { icon: 'trophy', duration: 4000 })
      }
    }
    check()
    const unsubs = [favoritesStore.subscribe(check), historyStore.subscribe(check)]
    return () => unsubs.forEach((u) => u())
  }, [toast, t])

  return null
}
