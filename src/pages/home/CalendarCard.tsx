import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayStats, useApp } from '../../store'
import { dateKey, fmtDur, fmtHours, fmtMonth, parseKey, todayKey } from '../../lib/dates'
import { Card, IconBtn, cx, ease } from '../../components/ui'

export function CalendarCard({ date, setDate, focusMap }: { date: string; setDate: (d: string) => void; focusMap: Record<string, number> }) {
  const s = useApp()
  const today = todayKey()
  const selD = parseKey(date)
  const [ym, setYm] = useState({ y: selD.getFullYear(), m: selD.getMonth(), dir: 0 })

  // o calendário acompanha o dia selecionado
  useEffect(() => {
    const d = parseKey(date)
    setYm((c) => (c.y === d.getFullYear() && c.m === d.getMonth() ? c : { y: d.getFullYear(), m: d.getMonth(), dir: d.getFullYear() * 12 + d.getMonth() > c.y * 12 + c.m ? 1 : -1 }))
  }, [date])

  const shift = (n: number) => setYm((c) => {
    const d = new Date(c.y, c.m + n, 1)
    return { y: d.getFullYear(), m: d.getMonth(), dir: n }
  })

  const cells = useMemo(() => {
    const offset = new Date(ym.y, ym.m, 1).getDay()
    const count = new Date(ym.y, ym.m + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: count }, (_, i) => {
        const key = dateKey(new Date(ym.y, ym.m, i + 1))
        return { key, day: i + 1, st: dayStats(s, key, focusMap[key] || 0) }
      }),
    ]
  }, [ym.y, ym.m, s, focusMap])

  const days = cells.filter((c) => c !== null)
  const monthFocus = days.reduce((a, c) => a + c.st.focusMin, 0)
  const activeDays = days.filter((c) => c.st.active).length
  const tasksDone = days.reduce((a, c) => a + c.st.tasksDone, 0)

  return (
    <Card
      className="cal"
      title="Calendário"
      right={
        <>
          <IconBtn label="Mês anterior" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </IconBtn>
          <span className="cal-month">{fmtMonth(ym.y, ym.m)}</span>
          <IconBtn label="Próximo mês" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </IconBtn>
        </>
      }
    >
      <div className="cal-week" aria-hidden>
        {'DSTQQSS'.split('').map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="cal-clip">
        <AnimatePresence mode="popLayout" initial={false} custom={ym.dir}>
          <motion.div
            key={`${ym.y}-${ym.m}`}
            className="cal-grid"
            custom={ym.dir}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease }}
          >
            {cells.map((c, i) =>
              c === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  type="button"
                  key={c.key}
                  className={cx('cal-day', c.key === today && 'today', c.key === date && 'sel', c.key > today && 'future')}
                  style={{ background: c.key === date ? undefined : `color-mix(in srgb, var(--ink) ${Math.round(c.st.score * 30)}%, transparent)` }}
                  aria-label={`${c.day}: ${Math.round(c.st.score * 100)}% do dia, ${fmtDur(c.st.focusMin)} de foco, ${c.st.tasksDone} de ${c.st.tasksTotal} tarefas`}
                  aria-pressed={c.key === date}
                  onClick={() => setDate(c.key)}
                >
                  {c.day}
                  {c.st.tasksTotal > c.st.tasksDone && <i />}
                </button>
              ),
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="cal-foot">
        <div>
          <strong className="serif num">{fmtHours(monthFocus)}</strong>
          <span>de foco</span>
        </div>
        <div>
          <strong className="serif num">{activeDays}</strong>
          <span>{activeDays === 1 ? 'dia ativo' : 'dias ativos'}</span>
        </div>
        <div>
          <strong className="serif num">{tasksDone}</strong>
          <span>{tasksDone === 1 ? 'tarefa feita' : 'tarefas feitas'}</span>
        </div>
      </div>
    </Card>
  )
}
