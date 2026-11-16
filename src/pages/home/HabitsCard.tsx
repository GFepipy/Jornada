import { useState } from 'react'
import { Flame, Pencil, Plus, Sprout, X } from 'lucide-react'
import { habitStreak, toggleHabit, update, useApp } from '../../store'
import { lastDays, todayKey, uid, weekdayInitial } from '../../lib/dates'
import { Card, Empty, IconBtn, Item, List, cx } from '../../components/ui'

export function HabitsCard({ date }: { date: string }) {
  const s = useApp()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  const today = todayKey()
  const days = lastDays(date, 7)
  const month = lastDays(date, 30)
  const doneToday = s.habits.filter((h) => s.habitLog[date]?.includes(h.id)).length

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    update((st) => void st.habits.push({ id: uid(), name: n, createdAt: today < date ? today : date }))
    setName('')
  }
  const remove = (id: string) =>
    update((st) => {
      st.habits = st.habits.filter((h) => h.id !== id)
      for (const k of Object.keys(st.habitLog)) {
        st.habitLog[k] = st.habitLog[k].filter((x) => x !== id)
        if (!st.habitLog[k].length) delete st.habitLog[k]
      }
    })

  return (
    <Card
      className="habits"
      title="Hábitos"
      right={
        s.habits.length > 0 && (
          <>
            <span className="num">
              {doneToday} de {s.habits.length}
            </span>
            <IconBtn label={editing ? 'Concluir edição' : 'Editar hábitos'} active={editing} onClick={() => setEditing(!editing)}>
              <Pencil size={14} />
            </IconBtn>
          </>
        )
      }
    >
      {s.habits.length > 0 && (
        <div className="habit-days" aria-hidden>
          {days.map((k) => (
            <span key={k} className={cx(k === date && 'main')}>
              {weekdayInitial(k)}
            </span>
          ))}
        </div>
      )}
      <List>
        {s.habits.map((h) => {
          const streak = habitStreak(s, h.id, date)
          const possible = month.filter((k) => k >= h.createdAt)
          const rate = possible.length ? Math.round((possible.filter((k) => s.habitLog[k]?.includes(h.id)).length / possible.length) * 100) : 0
          return (
            <Item key={h.id}>
              <div className="habit">
                {editing && (
                  <IconBtn label={`Excluir hábito ${h.name}`} onClick={() => remove(h.id)}>
                    <X size={15} />
                  </IconBtn>
                )}
                <div className="grow">
                  {editing ? (
                    <input className="input habit-input" value={h.name} aria-label="Nome do hábito" onChange={(e) => update((st) => void (st.habits.find((x) => x.id === h.id)!.name = e.target.value))} />
                  ) : (
                    <div className="habit-name">{h.name}</div>
                  )}
                  <div className="habit-meta num">
                    <span className={cx('streak', streak >= 3 && 'hot')}>
                      <Flame size={12} /> {streak} {streak === 1 ? 'dia' : 'dias'}
                    </span>
                    <span>{rate}% em 30 dias</span>
                  </div>
                </div>
                <div className="habit-dots">
                  {days.map((k) => {
                    const on = !!s.habitLog[k]?.includes(h.id)
                    return (
                      <button
                        type="button"
                        key={k}
                        className={cx('hdot', on && 'on', k === date && 'main')}
                        aria-pressed={on}
                        aria-label={`${h.name} em ${k}`}
                        disabled={k > today}
                        onClick={() => toggleHabit(k, h.id)}
                      >
                        <svg viewBox="0 0 16 16" aria-hidden>
                          <path d="M3.6 8.6l2.9 2.9 5.9-6.6" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Item>
          )
        })}
      </List>
      {s.habits.length === 0 && <Empty icon={<Sprout size={22} strokeWidth={1.5} />}>Crie seus hábitos diários e acompanhe a sequência de cada um.</Empty>}
      <form className="habit-add" onSubmit={add}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo hábito…" aria-label="Novo hábito" />
        <button type="submit" className="btn add-btn" aria-label="Adicionar hábito" disabled={!name.trim()}>
          <Plus size={18} />
        </button>
      </form>
    </Card>
  )
}
