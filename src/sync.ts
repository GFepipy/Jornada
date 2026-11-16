/**
 * Sincronização entre aparelhos.
 *
 * Os dados ficam em um arquivo (jornada.json) dentro de um repositório PRIVADO do GitHub.
 * Cada aparelho guarda o nome do repositório e um token de acesso só neste navegador
 * (nunca dentro dos dados sincronizados nem no código publicado).
 *
 * Regra de conflito: vale a versão alterada por último (campo updatedAt).
 */
import { useSyncExternalStore } from 'react'
import type { AppState } from './types'
import { getState, normalize, onLocalChange, replaceState } from './store'

const CFG_KEY = 'jornada:sync'
const FILE = 'jornada.json'

interface Cfg {
  repo: string // dono/repositorio
  token: string
  sha: string | null // versão do arquivo remoto que este aparelho já conhece
  dirty: boolean // há alterações locais ainda não enviadas
}
export type SyncState = 'off' | 'syncing' | 'ok' | 'error'
export interface SyncStatus {
  state: SyncState
  message: string
  lastSync: number | null
  repo: string
}

function loadCfg(): Cfg {
  try {
    return { repo: '', token: '', sha: null, dirty: false, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }
  } catch {
    return { repo: '', token: '', sha: null, dirty: false }
  }
}
let cfg = loadCfg()
const saveCfg = () => localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
const enabled = () => !!(cfg.repo && cfg.token)

let status: SyncStatus = { state: enabled() ? 'syncing' : 'off', message: '', lastSync: null, repo: cfg.repo }
const subs = new Set<() => void>()
const setStatus = (p: Partial<SyncStatus>) => {
  status = { ...status, ...p, repo: cfg.repo }
  subs.forEach((l) => l())
}
export const useSync = () =>
  useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => status,
  )

/* ---------- GitHub ---------- */

class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}
const url = () => `https://api.github.com/repos/${cfg.repo}/contents/${FILE}`
const headers = (accept = 'application/vnd.github+json') => ({
  Authorization: `Bearer ${cfg.token}`,
  Accept: accept,
  'X-GitHub-Api-Version': '2022-11-28',
})
const toB64 = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const fromB64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

async function getRemote(): Promise<{ sha: string; data: unknown } | null> {
  const res = await fetch(url(), { headers: headers(), cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new ApiError(res.status)
  const meta = await res.json()
  let text: string
  if (meta.content) text = fromB64(meta.content)
  else {
    // arquivos acima de 1 MB vêm sem conteúdo: busca o texto bruto
    const raw = await fetch(url(), { headers: headers('application/vnd.github.raw+json'), cache: 'no-store' })
    if (!raw.ok) throw new ApiError(raw.status)
    text = await raw.text()
  }
  return { sha: meta.sha, data: JSON.parse(text) }
}

async function putRemote(data: AppState, sha: string | null): Promise<string> {
  const res = await fetch(url(), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ message: 'Sincronização do Jornada', content: toB64(JSON.stringify(data)), ...(sha ? { sha } : {}) }),
  })
  if (!res.ok) throw new ApiError(res.status)
  return (await res.json()).content.sha
}

const explain = (e: unknown) => {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Token inválido ou expirado.'
    if (e.status === 403) return 'O token não tem permissão de escrita neste repositório (ou o limite de uso foi atingido).'
    if (e.status === 404) return 'Repositório não encontrado. Confira o nome e se o token tem acesso a ele.'
    return `O GitHub respondeu com erro ${e.status}.`
  }
  return navigator.onLine ? 'Não foi possível falar com o GitHub.' : 'Sem internet — as alterações serão enviadas quando a conexão voltar.'
}

/* ---------- Ciclo de sincronização ---------- */

let busy = false
let again = false
let timer: number | undefined

export async function syncNow(): Promise<void> {
  if (!enabled()) return
  if (busy) {
    again = true
    return
  }
  busy = true
  setStatus({ state: 'syncing' })
  try {
    for (let attempt = 0; ; attempt++) {
      const remote = await getRemote()
      if (remote && remote.sha !== cfg.sha) {
        const incoming = normalize(remote.data)
        // sem alterações locais pendentes, ou a nuvem é mais recente: fica a versão da nuvem
        if (!cfg.dirty || incoming.updatedAt >= getState().updatedAt) {
          replaceState(incoming)
          cfg.dirty = false
        }
        cfg.sha = remote.sha
        saveCfg()
      }
      if (!cfg.dirty && remote) break
      const snapshot = getState()
      try {
        cfg.sha = await putRemote(snapshot, remote ? cfg.sha : null)
        if (getState() === snapshot) cfg.dirty = false
        saveCfg()
        break
      } catch (e) {
        // outro aparelho gravou no meio do caminho: busca de novo e tenta mais uma vez
        if (e instanceof ApiError && (e.status === 409 || e.status === 422) && attempt < 2) continue
        throw e
      }
    }
    setStatus({ state: 'ok', message: '', lastSync: Date.now() })
  } catch (e) {
    setStatus({ state: 'error', message: explain(e) })
  } finally {
    busy = false
    if (again || cfg.dirty) {
      again = false
      schedule(status.state === 'error' ? 20000 : 1500)
    }
  }
}

function schedule(ms: number) {
  clearTimeout(timer)
  timer = window.setTimeout(syncNow, ms)
}

/**
 * Liga a sincronização neste aparelho.
 * Se já existem dados na nuvem, eles substituem os deste aparelho; se não, os dados daqui são enviados.
 */
export async function connect(repo: string, token: string) {
  cfg = { repo: repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$|\/$/g, ''), token: token.trim(), sha: null, dirty: false }
  saveCfg()
  await syncNow()
  if (status.state === 'error') {
    const message = status.message
    cfg = { repo: cfg.repo, token: '', sha: null, dirty: false }
    saveCfg()
    setStatus({ state: 'off', message })
    return false
  }
  return true
}

export function disconnect() {
  clearTimeout(timer)
  cfg = { repo: cfg.repo, token: '', sha: null, dirty: false }
  saveCfg()
  setStatus({ state: 'off', message: '' })
}

onLocalChange(() => {
  if (!enabled()) return
  if (!cfg.dirty) {
    cfg.dirty = true
    saveCfg()
  }
  schedule(2000)
})

if (enabled()) syncNow()
// busca novidades ao voltar para o app, ao reconectar e a cada 45 s com o app aberto
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow())
window.addEventListener('focus', () => syncNow())
window.addEventListener('online', () => syncNow())
setInterval(() => document.visibilityState === 'visible' && syncNow(), 45000)
