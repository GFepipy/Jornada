import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import type { Tab } from './types'
import { useApp } from './store'
import { todayKey } from './lib/dates'
import { Dock, ShellCtx } from './components/shell'
import { SettingsModal } from './components/Settings'
import { ease } from './components/ui'
import Home from './pages/Home'
import Gafero from './pages/Gafero'
import Health from './pages/Health'
import Art from './pages/Art'

const TAB_KEY = 'jornada:tab'

export default function App() {
  const { settings } = useApp()
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(TAB_KEY) as Tab) || 'inicio')
  const [date, setDate] = useState(todayKey)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // tema: claro, escuro ou seguindo o sistema
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const t = settings.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : settings.theme
      document.documentElement.dataset.theme = t
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#222221' : '#ece5d6')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  // se o app ficar aberto de um dia para o outro, acompanha a virada do dia
  const lastToday = useRef(todayKey())
  useEffect(() => {
    const check = () => {
      const t = todayKey()
      if (t !== lastToday.current) {
        setDate((d) => (d === lastToday.current ? t : d))
        lastToday.current = t
      }
    }
    const id = setInterval(check, 30000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  const go = useCallback((t: Tab) => {
    setTab(t)
    localStorage.setItem(TAB_KEY, t)
    window.scrollTo({ top: 0 })
  }, [])
  const ctx = useMemo(() => ({ go, openSettings: () => setSettingsOpen(true) }), [go])

  return (
    <MotionConfig reducedMotion="user">
      <ShellCtx.Provider value={ctx}>
        <div className="app">
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={tab}
              className="page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease }}
            >
              {tab === 'inicio' && <Home date={date} setDate={setDate} />}
              {tab === 'gafero' && <Gafero />}
              {tab === 'saude' && <Health date={date} setDate={setDate} />}
              {tab === 'arte' && <Art />}
            </motion.main>
          </AnimatePresence>
          <Dock tab={tab} onChange={go} />
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </ShellCtx.Provider>
    </MotionConfig>
  )
}
