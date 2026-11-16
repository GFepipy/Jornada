import { useState } from 'react'
import { Dumbbell, Plus, X } from 'lucide-react'
import type { WorkoutType } from '../types'
import { emptyHealth, patchHealth, useApp } from '../store'
import { fmtDur, fmtShort, lastDays, uid, weekdayInitial } from '../lib/dates'
import { WORKOUT_TYPES } from '../lib/meta'
import { TopBar } from '../components/shell'
import { Bars, Card, Chip, DateNav, Empty, IconBtn, Item, List, Num, Ring, Seg, Sparkline } from '../components/ui'

const TYPES = Object.keys(WORKOUT_TYPES) as WorkoutType[]
const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR')

export default function Health({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const s = useApp()
  const day = s.health[date] ?? emptyHealth()
  const goal = s.settings.calorieGoal
  const [w, setW] = useState<{ name: string; type: WorkoutType; minutes: string }>({ name: '', type: 'forca', minutes: '' })

  const cal = day.calories ?? 0
  const diff = goal - cal
  const setCal = (v: number | null) => patchHealth(date, (d) => void (d.calories = v === null ? null : Math.max(0, Math.round(v))))

  const d14 = lastDays(date, 14)
  const d30 = lastDays(date, 30)
  const logged = d30.map((k) => s.health[k]?.calories).filter((v): v is number => typeof v === 'number' && v > 0)
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0
  const workouts30 = d30.flatMap((k) => s.health[k]?.workouts ?? [])
  const trainedDays = d30.filter((k) => (s.health[k]?.workouts.length ?? 0) > 0).length
  const minutes30 = workouts30.reduce((a, x) => a + (x.minutes || 0), 0)
  const byType = TYPES.map((t) => ({ t, n: workouts30.filter((x) => x.type === t).length }))

  // histórico de peso (últimos registros até o dia selecionado)
  const weights = Object.keys(s.health)
    .filter((k) => k <= date && typeof s.health[k].weight === 'number')
    .sort()
    .slice(-30)
    .map((k) => s.health[k].weight as number)
  const wDelta = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0

  const addWorkout = (e: React.FormEvent) => {
    e.preventDefault()
    const name = w.name.trim() || WORKOUT_TYPES[w.type].label
    patchHealth(date, (d) => void d.workouts.push({ id: uid(), name, type: w.type, minutes: Math.max(0, Number(w.minutes) || 0) }))
    setW({ ...w, name: '', minutes: '' })
  }

  return (
    <>
      <TopBar eyebrow="Saúde">
        <DateNav date={date} onChange={setDate} />
      </TopBar>

      <div className="two-col">
        <div className="col col-a">
          <Card className="kcal" title="Calorias do dia" right={<span className="num">meta {n0(goal)} kcal</span>}>
            <div className="kcal-main">
              <Ring value={goal ? cal / goal : 0} size={128} stroke={9} color={cal > goal ? 'var(--accent)' : undefined}>
                <span className="ring-num serif num">
                  <Num value={goal ? (cal / goal) * 100 : 0} />
                  <small>%</small>
                </span>
              </Ring>
              <div className="grow">
                <label className="kcal-input">
                  <input
                    className="serif num"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={10}
                    placeholder="0"
                    aria-label="Calorias consumidas no dia"
                    value={day.calories ?? ''}
                    onChange={(e) => setCal(e.target.value === '' ? null : Number(e.target.value))}
                  />
                  <span>kcal</span>
                </label>
                <p className="kcal-status num">
                  {day.calories === null ? 'Digite o total que você consumiu no dia.' : diff >= 0 ? `${n0(diff)} kcal abaixo da meta` : `${n0(-diff)} kcal acima da meta`}
                </p>
                <div className="row wrap quick">
                  {[-100, 100, 250, 500].map((n) => (
                    <button key={n} type="button" className="btn ghost small num" onClick={() => setCal(cal + n)}>
                      {n > 0 ? `+${n}` : `−${-n}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="weight" title="Peso" right={weights.length > 1 && <span className="num">{wDelta > 0 ? '+' : ''}{wDelta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg no período</span>}>
            <div className="weight-main">
              <label className="kcal-input small">
                <input
                  className="serif num"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  placeholder="—"
                  aria-label="Peso do dia em quilos"
                  value={day.weight ?? ''}
                  onChange={(e) => patchHealth(date, (d) => void (d.weight = e.target.value === '' ? null : Math.max(0, Number(e.target.value))))}
                />
                <span>kg</span>
              </label>
              <div className="grow">{weights.length > 1 ? <Sparkline values={weights} /> : <p className="muted" style={{ fontSize: 13 }}>Opcional. Registre de vez em quando para ver a tendência.</p>}</div>
            </div>
          </Card>

          <Card className="h30" title="Últimos 30 dias">
            <div className="stats" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
              <div>
                <strong className="serif num">{workouts30.length}</strong>
                <span>{workouts30.length === 1 ? 'treino' : 'treinos'}</span>
              </div>
              <div>
                <strong className="serif num">{trainedDays}</strong>
                <span>{trainedDays === 1 ? 'dia treinado' : 'dias treinados'}</span>
              </div>
              <div>
                <strong className="serif num">{avg ? n0(avg) : '—'}</strong>
                <span>kcal por dia, em média</span>
              </div>
              <div>
                <strong className="serif num">{minutes30 ? fmtDur(minutes30) : '—'}</strong>
                <span>de treino registrado</span>
              </div>
            </div>
            {workouts30.length > 0 && (
              <>
                <div className="split" aria-hidden>
                  {byType.map(({ t, n }) => (n ? <i key={t} style={{ flexGrow: n, background: WORKOUT_TYPES[t].color }} /> : null))}
                </div>
                <div className="row wrap split-legend num">
                  {byType.map(({ t, n }) => (
                    <span key={t}>
                      <i className="dot" style={{ '--c': WORKOUT_TYPES[t].color } as React.CSSProperties} /> {WORKOUT_TYPES[t].label} · {n}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="col col-b">
          <Card className="workout" title="Treino do dia" right={day.workouts.length > 0 && <span className="num">{day.workouts.length} {day.workouts.length === 1 ? 'registro' : 'registros'}</span>}>
            <form className="workout-add" onSubmit={addWorkout}>
              <input className="input" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} placeholder="O que você treinou? Ex.: peito e tríceps" aria-label="Exercício do dia" />
              <div className="row wrap">
                <Seg<WorkoutType> small value={w.type} onChange={(v) => setW({ ...w, type: v })} options={TYPES.map((t) => ({ value: t, label: WORKOUT_TYPES[t].label }))} />
                <span className="grow" />
                <input className="input mins num" type="number" inputMode="numeric" min={0} step={5} value={w.minutes} onChange={(e) => setW({ ...w, minutes: e.target.value })} placeholder="min" aria-label="Duração em minutos (opcional)" />
                <button type="submit" className="btn add-btn" aria-label="Registrar treino">
                  <Plus size={18} />
                </button>
              </div>
            </form>
            <List className="workout-list">
              {day.workouts.map((x) => (
                <Item key={x.id}>
                  <div className="workout-row">
                    <Chip color={WORKOUT_TYPES[x.type].color}>{WORKOUT_TYPES[x.type].label}</Chip>
                    <span className="grow">{x.name}</span>
                    {x.minutes > 0 && <span className="muted num">{fmtDur(x.minutes)}</span>}
                    <IconBtn label="Excluir treino" onClick={() => patchHealth(date, (d) => void (d.workouts = d.workouts.filter((y) => y.id !== x.id)))}>
                      <X size={14} />
                    </IconBtn>
                  </div>
                </Item>
              ))}
            </List>
            {day.workouts.length === 0 && <Empty icon={<Dumbbell size={22} strokeWidth={1.5} />}>Nenhum treino registrado neste dia.</Empty>}
          </Card>

          <Card className="h14" title="Últimos 14 dias" right={<span>calorias e treinos</span>}>
            <Bars
              goal={goal}
              height={120}
              data={d14.map((k) => ({
                key: k,
                label: weekdayInitial(k),
                value: s.health[k]?.calories ?? 0,
                active: k === date,
                title: `${fmtShort(k)}: ${s.health[k]?.calories ? `${n0(s.health[k].calories!)} kcal` : 'sem registro'}`,
                onClick: () => setDate(k),
              }))}
            />
            <div className="wk-dots" aria-hidden>
              {d14.map((k) => (
                <span key={k}>
                  {[...new Set((s.health[k]?.workouts ?? []).map((x) => x.type))].map((t) => (
                    <i key={t} className="dot" style={{ '--c': WORKOUT_TYPES[t].color } as React.CSSProperties} />
                  ))}
                </span>
              ))}
            </div>
            <div className="row wrap split-legend">
              {TYPES.map((t) => (
                <span key={t}>
                  <i className="dot" style={{ '--c': WORKOUT_TYPES[t].color } as React.CSSProperties} /> {WORKOUT_TYPES[t].label}
                </span>
              ))}
              <span>
                <i className="dash" /> meta de calorias
              </span>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
