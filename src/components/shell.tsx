import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Briefcase, HeartPulse, House, Moon, Palette, Settings as SettingsIcon, Sun } from 'lucide-react'
import type { Tab } from '../types'
import { update, useApp } from '../store'
import { fmtClock } from '../lib/dates'
import { IconBtn, cx, spring } from './ui'
import { SyncBadge } from './SyncBadge'

export const ShellCtx = createContext<{ go: (t: Tab) => void; openSettings: () => void }>({ go: () => {}, openSettings: () => {} })

/** Relógio que só “tica” quando necessário. */
export function useNow(active: boolean, every = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(id)
  }, [active, every])
  return now
}

export const resolvedTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function TimerPill() {
  const s = useApp()
  const { go } = useContext(ShellCtx)
  const now = useNow(!!s.timer.startedAt)
  if (!s.timer.startedAt) return null
  return (
    <button type="button" className="timer-pill" onClick={() => go('inicio')} title="Cronômetro em andamento">
      <i />
      {fmtClock(now - s.timer.startedAt)}
    </button>
  )
}

export function TopBar({ eyebrow, title, children, hidePill, extra }: { eyebrow?: ReactNode; title?: ReactNode; children?: ReactNode; hidePill?: boolean; extra?: ReactNode }) {
  const { openSettings } = useContext(ShellCtx)
  useApp() // re-renderiza quando o tema muda
  const dark = resolvedTheme() === 'dark'
  return (
    <header className="topbar">
      <div className="grow">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && <h1>{title}</h1>}
        {children}
      </div>
      <div className="topbar-actions">
        {!hidePill && <TimerPill />}
        {extra}
        <SyncBadge />
        <IconBtn label={dark ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => update((s) => void (s.settings.theme = dark ? 'light' : 'dark'))}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </IconBtn>
        <IconBtn label="Configurações" onClick={openSettings}>
          <SettingsIcon size={18} />
        </IconBtn>
      </div>
    </header>
  )
}

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'inicio', label: 'Início', icon: House },
  { id: 'gafero', label: 'Gafero', icon: Briefcase },
  { id: 'saude', label: 'Saúde', icon: HeartPulse },
  { id: 'arte', label: 'Arte', icon: Palette },
]

export function Dock({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const running = !!useApp().timer.startedAt
  return (
    <nav className="dock" aria-label="Abas do aplicativo">
      {TABS.map(({ id, label, icon: Icon }) => {
        const on = tab === id
        return (
          <button key={id} type="button" className={cx('dock-btn', on && 'on')} aria-current={on ? 'page' : undefined} onClick={() => onChange(id)}>
            {on && <motion.span layoutId="dock-pill" className="dock-pill" transition={spring} />}
            <span className="dock-icon">
              <Icon size={22} strokeWidth={1.8} />
            </span>
            <span className="dock-label">{label}</span>
            {id === 'inicio' && running && !on && <i className="dock-dot" />}
          </button>
        )
      })}
    </nav>
  )
}
