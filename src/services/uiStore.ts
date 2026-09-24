import { createPersistentStore } from './persistentStore'

/** Preferências de interface persistidas (por dispositivo). */
export const uiStore = createPersistentStore('ui', {
  sidebarCollapsed: false,
  notificationsReadAt: 0,
})
