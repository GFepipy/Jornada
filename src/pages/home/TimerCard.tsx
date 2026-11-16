import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Pause, Play, X } from 'lucide-react'
import { focusMs, startTimer, stopTimer, update, useApp } from '../../store'
import { fmtClock, fmtDur, fmtTime, todayKey } from '../../lib/dates'
import { useNow } from '../../components/shell'
import { Card, IconBtn, Item, List, Progress, cx, ease } from '../../components/ui'

/** Dígitos com largura fixa; cada dígito que muda desliza de leve. */
function Digits({ text }: { text: string }) {
  return (
    <div className="digits serif" role="timer" aria-label={`Tempo de foco: ${text}`}>
      {text.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={i} className="colon">
            :
          </span>
        ) : (
          <span key={i} className="digit">
            <span key={ch}>{ch}</span>
          </span>
        ),
      )}
    </div>
  )
}

export function TimerCard({ date }: { date: string }) {
  const s = useApp()
  const isToday = date === todayKey()
  const running = !!s.timer.startedAt
  const now = useNow(running)
  const [pick, setPick] = useState('')
  const [open, setOpen] = useState(false)

  const total = focusMs(s, date, now)
  const goal = s.settings.focusGoal * 60000
  const pct = Math.round((total / goal) * 100)
  const left = Math.max(0, goal - total)
  const sessions = s.sessions.filter((x) => x.date === date).sort((a, b) => b.start - a.start)
  const openTasks = s.tasks.filter((t) => t.date === todayKey() && !t.done)
  const taskTitle = (id: string | null) => s.tasks.find((t) => t.id === id)?.title
  const linked = running ? (s.timer.taskId ?? '') : pick

  const status = !isToday
    ? total
      ? 'Total registrado neste dia'
      : 'Nenhum foco registrado neste dia'
    : running
      ? `Em foco há ${fmtClock(now - s.timer.startedAt!)}`
      : total
        ? 'Em pausa — o total do dia continua guardado'
        : 'Aperte play quando começar a trabalhar'

  return (
    <Card className={cx('timer', running && isToday && 'running')} title="Horas produtivas" right={<span>meta {fmtDur(s.settings.focusGoal)}</span>}>
      <div className="timer-main">
        <Digits text={fmtClock(total)} />
        {isToday && (
          <button
            type="button"
            className={cx('timer-btn', running && 'on')}
            aria-label={running ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            onClick={() => (running ? stopTimer() : startTimer(pick || null))}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={running ? 'pause' : 'play'}
                initial={{ scale: 0.4, opacity: 0, rotate: -40 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 40 }}
                transition={{ duration: 0.16, ease }}
              >
                {running ? <Pause size={24} fill="currentColor" strokeWidth={0} /> : <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </div>

      <p className="timer-status">
        {running && isToday && <i className="live" />}
        {status}
      </p>

      <Progress value={total / goal} color={running && isToday ? 'var(--accent)' : undefined} />
      <div className="timer-meta num">
        <span>{pct}% da meta</span>
        <span>{left > 0 ? `faltam ${fmtDur(Math.ceil(left / 60000))}` : 'meta do dia batida'}</span>
      </div>

      {isToday && (
        <label className="timer-link">
          <span>Focando em</span>
          <select
            className="select"
            value={linked}
            onChange={(e) => {
              const v = e.target.value
              if (running) update((st) => void (st.timer.taskId = v || null))
              else setPick(v)
            }}
          >
            <option value="">Sem tarefa específica</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {sessions.length > 0 && (
        <div className="sessions">
          <button type="button" className="sessions-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span>
              {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'} · maior {fmtDur(Math.max(...sessions.map((x) => x.end - x.start)) / 60000)}
            </span>
            <ChevronDown size={16} style={{ rotate: open ? '180deg' : '0deg', transition: 'rotate .25s var(--ease)' }} />
          </button>
          <List>
            {open &&
              sessions.map((x) => (
                <Item key={x.id}>
                  <div className="session num">
                    <span>
                      {fmtTime(x.start)} – {fmtTime(x.end)}
                    </span>
                    <span className="grow session-task">{taskTitle(x.taskId) ?? ''}</span>
                    <strong>{fmtDur(Math.max(1, (x.end - x.start) / 60000))}</strong>
                    <IconBtn label="Excluir sessão" onClick={() => update((st) => void (st.sessions = st.sessions.filter((y) => y.id !== x.id)))}>
                      <X size={14} />
                    </IconBtn>
                  </div>
                </Item>
              ))}
          </List>
        </div>
      )}
    </Card>
  )
}
