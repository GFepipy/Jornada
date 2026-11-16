import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GripVertical, Minus, Plus, X } from 'lucide-react'
import type { Task } from '../../types'
import { patchTask, update, useApp } from '../../store'
import { fmtDur, fmtTime, hhmmToMin, minToHHMM, nowMinutes, parseKey, todayKey } from '../../lib/dates'
import { AREAS } from '../../lib/meta'
import { HOURS } from '../../components/Settings'
import { useNow } from '../../components/shell'
import { Card, Check, IconBtn, cx, ease } from '../../components/ui'

const PPM = 1.2 // pixels por minuto
const SNAP = 15
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Distribui blocos sobrepostos em colunas lado a lado. */
function lanes(tasks: Task[]) {
  const out = new Map<string, { col: number; cols: number }>()
  const sorted = [...tasks].sort((a, b) => a.start - b.start || b.duration - a.duration)
  let cluster: Task[] = []
  let colsEnd: number[] = []
  let clusterEnd = -1
  const close = () => {
    for (const t of cluster) out.get(t.id)!.cols = colsEnd.length
    cluster = []
    colsEnd = []
  }
  for (const t of sorted) {
    const end = t.start + Math.max(t.duration, SNAP)
    if (t.start >= clusterEnd) close()
    let col = colsEnd.findIndex((e) => e <= t.start)
    if (col === -1) col = colsEnd.length
    colsEnd[col] = end
    out.set(t.id, { col, cols: 1 })
    cluster.push(t)
    clusterEnd = Math.max(clusterEnd, end)
  }
  close()
  return out
}

export function ScheduleCard({ date }: { date: string }) {
  const s = useApp()
  const { dayStart, dayEnd } = s.settings
  const isToday = date === todayKey()
  const now = useNow(isToday, 20000)
  const nowMin = nowMinutes()
  const scroller = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState<{ id: string; start: number; duration: number } | null>(null)
  const [sel, setSel] = useState<string | null>(null)

  const tasks = useMemo(
    () => s.tasks.filter((t) => t.date === date).map((t) => (drag?.id === t.id ? { ...t, start: drag.start, duration: drag.duration } : t)),
    [s.tasks, date, drag],
  )
  const layout = useMemo(() => lanes(tasks), [tasks])
  const selected = tasks.find((t) => t.id === sel) ?? null
  const planned = tasks.reduce((a, t) => a + t.duration, 0)
  const height = (dayEnd - dayStart) * PPM

  // ao abrir (ou trocar de dia), rola até o horário atual ou até o primeiro bloco
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = s.tasks.filter((t) => t.date === date).reduce((m, t) => Math.min(m, t.start), Infinity)
    const anchor = isToday ? nowMinutes() - 60 : Number.isFinite(first) ? first - 30 : 8 * 60
    el.scrollTop = Math.max(0, (anchor - dayStart) * PPM)
    setSel(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dayStart])

  const begin = (e: React.PointerEvent, t: Task, mode: 'move' | 'resize') => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const y0 = e.clientY
    const scroll0 = scroller.current?.scrollTop ?? 0
    let moved = false
    let cur = { id: t.id, start: t.start, duration: t.duration }
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - y0 + ((scroller.current?.scrollTop ?? 0) - scroll0)
      if (!moved && Math.abs(dy) < 4) return
      moved = true
      const d = Math.round(dy / PPM / SNAP) * SNAP
      cur =
        mode === 'move'
          ? { ...cur, start: clamp(t.start + d, dayStart, Math.max(dayStart, dayEnd - t.duration)) }
          : { ...cur, duration: clamp(t.duration + d, SNAP, Math.max(SNAP, dayEnd - t.start)) }
      setDrag(cur)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setDrag(null)
      if (moved) {
        suppressClick.current = true
        setTimeout(() => (suppressClick.current = false), 50)
        patchTask(t.id, { start: cur.start, duration: cur.duration })
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const toggleSel = (id: string) => {
    if (suppressClick.current) return
    setSel((cur) => (cur === id ? null : id))
  }

  // faixa de foco real (sessões gravadas + sessão em andamento)
  const dayMs = parseKey(date).getTime()
  const strips = s.sessions.filter((x) => x.date === date).map((x) => ({ id: x.id, a: (x.start - dayMs) / 60000, b: (x.end - dayMs) / 60000, start: x.start, end: x.end }))
  if (isToday && s.timer.startedAt) {
    const a = Math.max(s.timer.startedAt, dayMs)
    strips.push({ id: 'live', a: (a - dayMs) / 60000, b: (now - dayMs) / 60000, start: a, end: now })
  }

  const hours = HOURS.filter((h) => h >= dayStart && h <= dayEnd)

  return (
    <Card
      className="sched"
      title="Cronograma"
      right={
        <div className="sched-range">
          <select aria-label="Início do cronograma" value={dayStart} onChange={(e) => update((st) => void (st.settings.dayStart = Number(e.target.value)))}>
            {HOURS.filter((h) => h < dayEnd).map((h) => (
              <option key={h} value={h}>
                {minToHHMM(h)}
              </option>
            ))}
          </select>
          <span>–</span>
          <select aria-label="Fim do cronograma" value={dayEnd} onChange={(e) => update((st) => void (st.settings.dayEnd = Number(e.target.value)))}>
            {HOURS.filter((h) => h > dayStart).map((h) => (
              <option key={h} value={h}>
                {h === 1440 ? '24:00' : minToHHMM(h)}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="editor"
            className="blk-editor-wrap"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
          >
            <div className="blk-editor">
              <Check checked={selected.done} onChange={(v) => patchTask(selected.id, { done: v })} label="Concluir tarefa" color={AREAS[selected.area].color} />
              <strong className="grow">{selected.title}</strong>
              <input
                type="time"
                step={900}
                aria-label="Horário de início"
                value={minToHHMM(selected.start)}
                onChange={(e) => e.target.value && patchTask(selected.id, { start: hhmmToMin(e.target.value) })}
              />
              <div className="stepper">
                <IconBtn label="Diminuir 15 minutos" onClick={() => patchTask(selected.id, { duration: Math.max(SNAP, selected.duration - SNAP) })}>
                  <Minus size={14} />
                </IconBtn>
                <span className="num">{fmtDur(selected.duration)}</span>
                <IconBtn label="Aumentar 15 minutos" onClick={() => patchTask(selected.id, { duration: selected.duration + SNAP })}>
                  <Plus size={14} />
                </IconBtn>
              </div>
              <IconBtn label="Fechar" onClick={() => setSel(null)}>
                <X size={15} />
              </IconBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sched-scroll" ref={scroller}>
        <div className="sched-body" style={{ height }}>
          {hours.map((h) => (
            <div key={h} className="sched-hour" style={{ top: (h - dayStart) * PPM }}>
              <span className="num">{h === 1440 ? '24:00' : minToHHMM(h)}</span>
            </div>
          ))}

          <div className="sched-strips" aria-hidden>
            {strips.map((x) => {
              const top = (clamp(x.a, dayStart, dayEnd) - dayStart) * PPM
              const h = (clamp(x.b, dayStart, dayEnd) - dayStart) * PPM - top
              return h > 0 ? <i key={x.id} className={cx(x.id === 'live' && 'live')} style={{ top, height: Math.max(2, h) }} title={`Foco: ${fmtTime(x.start)} – ${fmtTime(x.end)}`} /> : null
            })}
          </div>

          <div className="sched-blocks">
            {tasks.map((t) => {
              const { col, cols } = layout.get(t.id) ?? { col: 0, cols: 1 }
              const top = (clamp(t.start, dayStart, dayEnd - SNAP) - dayStart) * PPM
              const h = Math.max(SNAP, Math.min(t.duration, dayEnd - Math.max(t.start, dayStart))) * PPM
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.title}, ${minToHHMM(t.start)} às ${minToHHMM(t.start + t.duration)}`}
                  className={cx('blk', t.done && 'done', drag?.id === t.id && 'dragging', sel === t.id && 'sel', h < 40 && 'short')}
                  style={
                    {
                      top,
                      height: h - 2,
                      left: `calc(${(col / cols) * 100}% + 1px)`,
                      width: `calc(${100 / cols}% - 3px)`,
                      '--c': AREAS[t.area].color,
                    } as React.CSSProperties
                  }
                  onPointerDown={(e) => e.pointerType === 'mouse' && begin(e, t, 'move')}
                  onClick={() => toggleSel(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleSel(t.id)
                    }
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      const d = e.key === 'ArrowUp' ? -SNAP : SNAP
                      patchTask(t.id, { start: clamp(t.start + d, dayStart, Math.max(dayStart, dayEnd - t.duration)) })
                    }
                  }}
                >
                  <span className="blk-grip" onPointerDown={(e) => begin(e, t, 'move')} aria-hidden>
                    <GripVertical size={14} />
                  </span>
                  <span className="blk-title">{t.title}</span>
                  <span className="blk-time num">
                    {minToHHMM(t.start)} – {minToHHMM(t.start + t.duration)}
                  </span>
                  <span className="blk-resize" onPointerDown={(e) => begin(e, t, 'resize')} aria-hidden />
                </div>
              )
            })}
          </div>

          {isToday && nowMin >= dayStart && nowMin <= dayEnd && (
            <div className="sched-now" style={{ top: (nowMin - dayStart) * PPM }} aria-hidden>
              <i />
            </div>
          )}
        </div>
      </div>

      <div className="sched-foot num">
        <span>{planned > 0 ? `${fmtDur(planned)} planejadas` : 'Adicione tarefas para montar o dia'}</span>
        <span className="sched-legend">
          <i /> foco real
        </span>
      </div>
    </Card>
  )
}
