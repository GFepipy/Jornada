export const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => dateKey(new Date())
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: string, n: number) => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}
/** últimos n dias terminando em `end` (inclusive), do mais antigo ao mais recente */
export const lastDays = (end: string, n: number) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1))

export const diffDays = (a: string, b: string) => Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86400000)

export const minToHHMM = (m: number) => `${pad(m / 60)}:${pad(m % 60)}`
export const hhmmToMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** 95 → "1h35" · 40 → "40min" · 120 → "2h" */
export const fmtDur = (min: number) => {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}min`
  return r === 0 ? `${h}h` : `${h}h${pad(r)}`
}
/** horas decimais curtas: 1,5h */
export const fmtHours = (min: number) => `${(min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}
export const fmtTime = (epoch: number) => {
  const d = new Date(epoch)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const fmtLong = (k: string) =>
  cap(parseKey(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))
export const fmtShort = (k: string) =>
  parseKey(k).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
export const fmtMonth = (y: number, m: number) =>
  cap(new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
export const weekdayInitial = (k: string) => 'DSTQQSS'[parseKey(k).getDay()]

export const relativeDay = (k: string) => {
  const d = diffDays(k, todayKey())
  if (d === 0) return 'Hoje'
  if (d === -1) return 'Ontem'
  if (d === 1) return 'Amanhã'
  return null
}

export const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
