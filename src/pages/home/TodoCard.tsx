import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ListTodo, Play, Plus, RotateCcw, X } from 'lucide-react'
import type { Area } from '../../types'
import { addTask, carryOver, patchTask, removeTask, startTimer, useApp } from '../../store'
import { fmtDur, minToHHMM, todayKey } from '../../lib/dates'
import { AREAS, AREA_ORDER, DURATIONS } from '../../lib/meta'
import { Card, Check, Empty, IconBtn, Item, List, Progress, cx, ease } from '../../components/ui'

export function TodoCard({ date }: { date: string }) {
  const s = useApp()
  const today = todayKey()
  const isToday = date === today
  const [title, setTitle] = useState('')
  const [dur, setDur] = useState(30)
  const [area, setArea] = useState<Area>('pessoal')
  const [editing, setEditing] = useState<string | null>(null)

  const tasks = useMemo(() => s.tasks.filter((t) => t.date === date).sort((a, b) => a.start - b.start), [s.tasks, date])
  const done = tasks.filter((t) => t.done).length
  const overdue = isToday ? s.tasks.filter((t) => t.date < today && !t.done).length : 0

  // foco real acumulado em cada tarefa (planejado × realizado)
  const focus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of s.sessions) if (x.taskId) m[x.taskId] = (m[x.taskId] || 0) + (x.end - x.start) / 60000
    return m
  }, [s.sessions])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addTask(date, title, dur, area)
    setTitle('')
  }

  return (
    <Card
      className="todo-card"
      title="Tarefas"
      right={
        tasks.length > 0 && (
          <span className="num">
            {done} de {tasks.length}
          </span>
        )
      }
    >
      {tasks.length > 0 && <Progress value={done / tasks.length} />}

      <form className="todo-add" onSubmit={submit}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adicionar tarefa…" aria-label="Nova tarefa" />
        <select className="select" value={dur} onChange={(e) => setDur(Number(e.target.value))} aria-label="Duração">
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {fmtDur(d)}
            </option>
          ))}
        </select>
        <select className="select" value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Área">
          {AREA_ORDER.map((a) => (
            <option key={a} value={a}>
              {AREAS[a].label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn add-btn" aria-label="Adicionar tarefa" disabled={!title.trim()}>
          <Plus size={18} />
        </button>
      </form>

      <AnimatePresence initial={false}>
        {overdue > 0 && (
          <motion.button
            type="button"
            className="carry"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
            onClick={carryOver}
          >
            <span>
              <RotateCcw size={14} />
              {overdue} {overdue === 1 ? 'pendência' : 'pendências'} de dias anteriores — trazer para hoje
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <List className="todo-list">
        {tasks.map((t) => (
          <Item key={t.id}>
            <div className={cx('todo', t.done && 'done')}>
              <Check checked={t.done} onChange={(v) => patchTask(t.id, { done: v })} label={`Concluir: ${t.title}`} color={AREAS[t.area].color} />
              <div className="grow">
                {editing === t.id ? (
                  <input
                    className="todo-edit"
                    autoFocus
                    defaultValue={t.title}
                    aria-label="Editar tarefa"
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v && v !== t.title) patchTask(t.id, { title: v })
                      setEditing(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <button type="button" className="todo-title" onClick={() => setEditing(t.id)} title="Clique para editar">
                    <span>{t.title}</span>
                  </button>
                )}
                <div className="todo-meta num">
                  <span>
                    {minToHHMM(t.start)} · {fmtDur(t.duration)}
                  </span>
                  {t.area !== 'pessoal' && <span style={{ color: AREAS[t.area].color }}>{AREAS[t.area].label}</span>}
                  {focus[t.id] >= 1 && <span>{fmtDur(focus[t.id])} de foco</span>}
                </div>
              </div>
              <div className="todo-actions">
                {isToday && !t.done && (
                  <IconBtn label="Iniciar foco nesta tarefa" onClick={() => startTimer(t.id)} active={s.timer.taskId === t.id}>
                    <Play size={14} />
                  </IconBtn>
                )}
                <IconBtn label="Excluir tarefa" onClick={() => removeTask(t.id)}>
                  <X size={15} />
                </IconBtn>
              </div>
            </div>
          </Item>
        ))}
      </List>

      {tasks.length === 0 && <Empty icon={<ListTodo size={22} strokeWidth={1.5} />}>Nada planejado para este dia. O que você adicionar aqui já entra no cronograma.</Empty>}
    </Card>
  )
}
