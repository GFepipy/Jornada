import { useSyncExternalStore } from 'react'
import type { AppState, Area, HealthDay, Task } from './types'
import { addDays, dateKey, nowMinutes, parseKey, todayKey, uid } from './lib/dates'

const KEY = 'jornada:v1'

const defaults = (): AppState => ({
  version: 1,
  updatedAt: 0,
  settings: { name: 'Gabriel', theme: 'auto', dayStart: 6 * 60, dayEnd: 23 * 60, focusGoal: 6 * 60, calorieGoal: 2200 },
  tasks: [],
  sessions: [],
  timer: { startedAt: null, taskId: null },
  habits: [],
  habitLog: {},
  dayNotes: {},
  gafero: { projects: [], library: [] },
  health: {},
  art: { items: [], ideas: [], projects: [] },
})

/** Garante que qualquer dado carregado (ou importado) tenha todas as chaves esperadas. */
export function normalize(raw: unknown): AppState {
  const d = defaults()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<AppState>
  return {
    ...d,
    ...r,
    version: 1,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
    gafero: { projects: r.gafero?.projects ?? [], library: r.gafero?.library ?? [] },
    settings: { ...d.settings, ...r.settings },
    timer: { ...d.timer, ...r.timer },
    art: { ...d.art, ...r.art },
    tasks: r.tasks ?? [],
    sessions: r.sessions ?? [],
    habits: r.habits ?? [],
    habitLog: r.habitLog ?? {},
    dayNotes: r.dayNotes ?? {},
    health: r.health ?? {},
  }
}

function load(): AppState {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY) || 'null'))
  } catch {
    return defaults()
  }
}

let state = load()
const listeners = new Set<() => void>()
let saveTimer: number | undefined

function flush() {
  if (saveTimer === undefined) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Não foi possível salvar os dados', e)
  }
}
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(flush, 250)
}
window.addEventListener('pagehide', flush)
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
// mantém duas abas do navegador em sincronia
window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return
  try {
    state = normalize(JSON.parse(e.newValue))
    listeners.forEach((l) => l())
  } catch {}
})

export const getState = () => state
export function update(fn: (s: AppState) => void) {
  const next = structuredClone(state)
  fn(next)
  next.updatedAt = Date.now()
  state = next
  scheduleSave()
  listeners.forEach((l) => l())
  changeHooks.forEach((h) => h())
}
/** Avisa quando o usuário altera algo neste aparelho (usado pela sincronização). */
const changeHooks = new Set<() => void>()
export const onLocalChange = (h: () => void) => void changeHooks.add(h)
export function replaceState(next: AppState) {
  state = next
  scheduleSave()
  flush()
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useApp = () => useSyncExternalStore(subscribe, getState)

/* ================= Cronômetro ================= */

export function startTimer(taskId: string | null = null) {
  update((s) => {
    if (s.timer.startedAt) s.timer.taskId = taskId ?? s.timer.taskId
    else s.timer = { startedAt: Date.now(), taskId }
  })
}

export function stopTimer() {
  update((s) => {
    const { startedAt, taskId } = s.timer
    if (!startedAt) return
    const end = Date.now()
    // sessões que atravessam a meia-noite são divididas entre os dois dias
    let a = startedAt
    while (end - a >= 5000) {
      const d = new Date(a)
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
      const b = Math.min(end, midnight)
      s.sessions.push({ id: uid(), date: dateKey(d), start: a, end: b, taskId })
      a = b
    }
    s.timer = { startedAt: null, taskId: null }
  })
}

/** Tempo de foco (ms) em um dia, incluindo a sessão em andamento. */
export function focusMs(s: AppState, date: string, now = Date.now()) {
  let total = 0
  for (const x of s.sessions) if (x.date === date) total += x.end - x.start
  if (s.timer.startedAt) {
    const dayStart = parseKey(date).getTime()
    const dayEnd = dayStart + 86400000
    const a = Math.max(s.timer.startedAt, dayStart)
    const b = Math.min(now, dayEnd)
    if (b > a) total += b - a
  }
  return total
}

/** Mapa data → minutos de foco, para gráficos e calendário. */
export function focusByDate(s: AppState, now = Date.now()) {
  const map: Record<string, number> = {}
  for (const x of s.sessions) map[x.date] = (map[x.date] || 0) + (x.end - x.start) / 60000
  if (s.timer.startedAt) {
    const k = todayKey()
    map[k] = (map[k] || 0) + Math.max(0, now - Math.max(s.timer.startedAt, parseKey(k).getTime())) / 60000
  }
  return map
}

/* ================= Tarefas e cronograma ================= */

/** Primeiro horário livre do dia que comporta a duração pedida. */
export function findSlot(s: AppState, date: string, duration: number, ignoreId?: string) {
  const { dayStart, dayEnd } = s.settings
  let from = dayStart
  if (date === todayKey()) from = Math.max(dayStart, Math.ceil(nowMinutes() / 15) * 15)
  const busy = s.tasks
    .filter((t) => t.date === date && t.id !== ignoreId)
    .map((t) => [t.start, t.start + t.duration] as const)
    .sort((a, b) => a[0] - b[0])
  let cursor = from
  for (const [a, b] of busy) {
    if (b <= cursor) continue
    if (a - cursor >= duration) break
    cursor = Math.max(cursor, b)
  }
  if (cursor + duration <= dayEnd) return cursor
  return Math.max(dayStart, Math.min(from, dayEnd - duration))
}

export function addTask(date: string, title: string, duration = 30, area: Area = 'pessoal', ref?: Task['ref']) {
  const t = title.trim()
  if (!t) return
  update((s) => {
    s.tasks.push({ id: uid(), date, title: t, done: false, duration, start: findSlot(s, date, duration), area, ref })
  })
}

export function patchTask(id: string, patch: Partial<Task>) {
  update((s) => {
    const t = s.tasks.find((x) => x.id === id)
    if (!t) return
    Object.assign(t, patch)
    if ('done' in patch && t.ref) {
      const pt = s.gafero.projects.find((p) => p.id === t.ref!.projectId)?.tasks.find((x) => x.id === t.ref!.taskId)
      if (pt) pt.status = t.done ? 'done' : 'doing'
    }
  })
}

export function removeTask(id: string) {
  update((s) => {
    s.tasks = s.tasks.filter((t) => t.id !== id)
    if (s.timer.taskId === id) s.timer.taskId = null
  })
}

/** Traz para hoje as tarefas não concluídas de dias anteriores. */
export function carryOver() {
  const today = todayKey()
  update((s) => {
    for (const t of s.tasks) {
      if (t.date < today && !t.done) {
        t.date = today
        t.start = findSlot(s, today, t.duration, t.id)
      }
    }
  })
}

/* ================= Hábitos ================= */

export function toggleHabit(date: string, habitId: string) {
  update((s) => {
    const list = s.habitLog[date] || []
    s.habitLog[date] = list.includes(habitId) ? list.filter((x) => x !== habitId) : [...list, habitId]
    if (s.habitLog[date].length === 0) delete s.habitLog[date]
    // marcar um dia anterior à criação do hábito passa a contar esse dia no histórico
    const h = s.habits.find((x) => x.id === habitId)
    if (h && date < h.createdAt) h.createdAt = date
  })
}

/** Dias seguidos com o hábito feito, terminando em `date` (ou no dia anterior, se `date` ainda está em aberto). */
export function habitStreak(s: AppState, habitId: string, date: string) {
  const done = (k: string) => s.habitLog[k]?.includes(habitId)
  let k = done(date) ? date : addDays(date, -1)
  let n = 0
  while (done(k)) {
    n++
    k = addDays(k, -1)
  }
  return n
}

/* ================= Notas do dia / Saúde ================= */

export function setDayNote(date: string, patch: Partial<{ intention: string; note: string }>) {
  update((s) => {
    const cur = s.dayNotes[date]
    s.dayNotes[date] = { intention: patch.intention ?? cur?.intention ?? '', note: patch.note ?? cur?.note ?? '' }
  })
}

export const emptyHealth = (): HealthDay => ({ calories: null, weight: null, workouts: [] })
export function patchHealth(date: string, fn: (d: HealthDay) => void) {
  update((s) => {
    const d = s.health[date] ?? emptyHealth()
    fn(d)
    s.health[date] = d
  })
}

/* ================= Resumo de um dia ================= */

export interface DayStats {
  tasksDone: number
  tasksTotal: number
  habitsDone: number
  habitsTotal: number
  focusMin: number
  /** 0–1: média das frentes que têm algo registrado no dia */
  score: number
  active: boolean
}

export function dayStats(s: AppState, date: string, focusMin: number): DayStats {
  const tasks = s.tasks.filter((t) => t.date === date)
  const tasksDone = tasks.filter((t) => t.done).length
  const habitIds = new Set(s.habits.filter((h) => h.createdAt <= date).map((h) => h.id))
  const habitsDone = (s.habitLog[date] || []).filter((id) => habitIds.has(id)).length
  const parts: number[] = []
  if (tasks.length) parts.push(tasksDone / tasks.length)
  if (habitIds.size) parts.push(habitsDone / habitIds.size)
  parts.push(Math.min(1, focusMin / Math.max(1, s.settings.focusGoal)))
  const active = tasksDone > 0 || habitsDone > 0 || focusMin >= 1
  return {
    tasksDone,
    tasksTotal: tasks.length,
    habitsDone,
    habitsTotal: habitIds.size,
    focusMin,
    score: active ? parts.reduce((a, b) => a + b, 0) / parts.length : 0,
    active,
  }
}
