import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Target } from 'lucide-react'
import { dayStats, focusByDate, setDayNote, useApp, type DayStats } from '../store'
import { addDays, fmtDur, fmtHours, fmtShort, greeting, lastDays, todayKey, weekdayInitial } from '../lib/dates'
import { TopBar, useNow } from '../components/shell'
import { AutoTextarea, Bars, Card, DateNav, IconBtn, Num, Ring, spring } from '../components/ui'
import { TimerCard } from './home/TimerCard'
import { TodoCard } from './home/TodoCard'
import { ScheduleCard } from './home/ScheduleCard'
import { CalendarCard } from './home/CalendarCard'
import { HabitsCard } from './home/HabitsCard'

/** Ícone no menu do topo que expande o calendário completo. */
function CalendarButton({ date, setDate, focusMap }: { date: string; setDate: (d: string) => void; focusMap: Record<string, number> }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={wrap} className="cal-wrap">
      <IconBtn label={open ? 'Fechar calendário' : 'Abrir calendário'} active={open} onClick={() => setOpen(!open)}>
        <CalendarDays size={18} />
      </IconBtn>
      <AnimatePresence>
        {open && (
          <motion.div
            className="cal-pop"
            role="dialog"
            aria-label="Calendário"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={spring}
          >
            <CalendarCard
              date={date}
              focusMap={focusMap}
              setDate={(d) => {
                setDate(d)
                setOpen(false)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SummaryCard({ st, goal }: { st: DayStats; goal: number }) {
  const rings = [
    { label: 'Tarefas', value: st.tasksTotal ? st.tasksDone / st.tasksTotal : 0, detail: st.tasksTotal ? `${st.tasksDone} de ${st.tasksTotal}` : 'sem tarefas', color: undefined },
    { label: 'Hábitos', value: st.habitsTotal ? st.habitsDone / st.habitsTotal : 0, detail: st.habitsTotal ? `${st.habitsDone} de ${st.habitsTotal}` : 'sem hábitos', color: undefined },
    { label: 'Foco', value: Math.min(1, st.focusMin / goal), detail: `${fmtDur(st.focusMin)} de ${fmtDur(goal)}`, color: 'var(--accent)' },
  ]
  return (
    <Card
      className="summary"
      title="Resumo do dia"
      right={
        <span className="num">
          <Num value={st.score * 100} format={(n) => `${Math.round(n)}%`} /> completo
        </span>
      }
    >
      <div className="rings">
        {rings.map((r) => (
          <div key={r.label} className="ring-item">
            <Ring value={r.value} color={r.color}>
              <span className="ring-num serif num">
                <Num value={r.value * 100} />
                <small>%</small>
              </span>
            </Ring>
            <strong>{r.label}</strong>
            <span className="num">{r.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function WeekCard({ date, setDate, focusMap, goal }: { date: string; setDate: (d: string) => void; focusMap: Record<string, number>; goal: number }) {
  const s = useApp()
  const days = lastDays(date, 7)
  const total = days.reduce((a, k) => a + (focusMap[k] || 0), 0)

  // sequência de dias ativos e recorde de foco
  const { streak, best } = useMemo(() => {
    const today = todayKey()
    const active = (k: string) => dayStats(s, k, focusMap[k] || 0).active
    let k = active(today) ? today : addDays(today, -1)
    let n = 0
    while (n < 3650 && active(k)) {
      n++
      k = addDays(k, -1)
    }
    let bestKey = ''
    for (const d of Object.keys(focusMap)) if (!bestKey || focusMap[d] > focusMap[bestKey]) bestKey = d
    return { streak: n, best: bestKey ? { key: bestKey, min: focusMap[bestKey] } : null }
  }, [s, focusMap])

  return (
    <Card className="week" title="Foco nos últimos 7 dias">
      <Bars
        goal={goal}
        data={days.map((k) => ({
          key: k,
          label: weekdayInitial(k),
          value: focusMap[k] || 0,
          active: k === date,
          title: `${fmtShort(k)}: ${fmtDur(focusMap[k] || 0)}`,
          onClick: () => setDate(k),
        }))}
      />
      <div className="stats">
        <div>
          <strong className="serif num">{fmtHours(total)}</strong>
          <span>na semana</span>
        </div>
        <div>
          <strong className="serif num">{fmtHours(total / 7)}</strong>
          <span>média por dia</span>
        </div>
        <div>
          <strong className="serif num">{streak}</strong>
          <span>{streak === 1 ? 'dia ativo seguido' : 'dias ativos seguidos'}</span>
        </div>
        <div>
          <strong className="serif num">{best && best.min >= 1 ? fmtDur(best.min) : '—'}</strong>
          <span>{best && best.min >= 1 ? `recorde · ${fmtShort(best.key)}` : 'recorde de foco'}</span>
        </div>
      </div>
    </Card>
  )
}

export default function Home({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const s = useApp()
  const now = useNow(!!s.timer.startedAt, 15000)
  const focusMap = useMemo(() => focusByDate(s, now), [s, now])
  const st = dayStats(s, date, focusMap[date] || 0)
  const note = s.dayNotes[date]
  const name = s.settings.name.trim()

  return (
    <>
      <TopBar hidePill eyebrow={`${greeting()}${name ? `, ${name}` : ''}`} extra={<CalendarButton date={date} setDate={setDate} focusMap={focusMap} />}>
        <DateNav date={date} onChange={setDate} />
      </TopBar>

      <label className="intention">
        <Target size={18} strokeWidth={1.6} />
        <input
          className="serif"
          value={note?.intention ?? ''}
          onChange={(e) => setDayNote(date, { intention: e.target.value })}
          placeholder="Qual é a coisa mais importante deste dia?"
          aria-label="Foco do dia"
        />
      </label>

      <div className="home-grid">
        <div className="col col-a">
          <TimerCard date={date} />
          <HabitsCard date={date} />
          <WeekCard date={date} setDate={setDate} focusMap={focusMap} goal={s.settings.focusGoal} />
        </div>
        <div className="col col-b">
          <TodoCard date={date} />
          <SummaryCard st={st} goal={s.settings.focusGoal} />
        </div>
        <div className="col col-c">
          <ScheduleCard date={date} />
          <Card className="note" title="Reflexão do dia">
            <AutoTextarea
              className="plain"
              minRows={3}
              value={note?.note ?? ''}
              onChange={(v) => setDayNote(date, { note: v })}
              placeholder="Como foi o dia? O que funcionou, o que travou, o que muda amanhã…"
            />
          </Card>
        </div>
      </div>
    </>
  )
}
