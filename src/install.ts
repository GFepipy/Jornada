/**
 * Instalação do app (PWA) no Android ou no desktop.
 * O navegador avisa quando o app pode ser instalado (evento beforeinstallprompt);
 * guardamos esse aviso para o botão das Configurações disparar a instalação.
 */
import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'available' | 'installed' | 'unavailable'

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

let deferred: InstallPromptEvent | null = null
let state: InstallState = standalone() ? 'installed' : 'unavailable'
const subs = new Set<() => void>()
const set = (s: InstallState) => {
  state = s
  subs.forEach((l) => l())
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  set('available')
})
window.addEventListener('appinstalled', () => {
  deferred = null
  set('installed')
})

export const useInstall = () =>
  useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => state,
  )

export async function installApp() {
  if (!deferred) return
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  set(outcome === 'accepted' ? 'installed' : 'unavailable')
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
