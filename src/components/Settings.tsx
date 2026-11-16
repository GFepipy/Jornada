import { useRef, useState } from 'react'
import { Download, Monitor, Moon, Sun, Upload } from 'lucide-react'
import type { Theme } from '../types'
import { getState, normalize, replaceState, update, useApp } from '../store'
import { minToHHMM, todayKey } from '../lib/dates'
import { Field, Modal, Seg } from './ui'
import { connect, disconnect, syncNow, useSync } from '../sync'
import { installApp, isIOS, useInstall } from '../install'
import { MonitorSmartphone } from 'lucide-react'

export const HOURS = Array.from({ length: 25 }, (_, i) => i * 60)

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <SettingsBody />
    </Modal>
  )
}

function InstallSection() {
  const state = useInstall()
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        Instalar aplicativo
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        {state === 'installed'
          ? 'O Jornada já está instalado neste aparelho.'
          : state === 'available'
            ? 'Cria um ícone do Jornada na tela inicial (Android) ou na área de trabalho, abrindo em janela própria.'
            : isIOS()
              ? 'No iPhone/iPad: toque em Compartilhar no Safari e escolha “Adicionar à Tela de Início”.'
              : 'A instalação não está disponível agora. Abra o site publicado no Chrome ou Edge; se já estiver instalado, o botão não aparece. Também dá para instalar pelo menu do navegador (“Instalar app” / “Adicionar à tela inicial”).'}
      </p>
      {state === 'available' && (
        <button type="button" className="btn" onClick={installApp}>
          <MonitorSmartphone size={16} /> Instalar o Jornada
        </button>
      )}
    </div>
  )
}

function SyncSection() {
  const sync = useSync()
  const [repo, setRepo] = useState(sync.repo || 'GFepipy/jornada-dados')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const on = sync.state !== 'off'
  const when = sync.lastSync ? ` às ${new Date(sync.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        Sincronização entre aparelhos
      </div>
      {on ? (
        <>
          <p style={{ fontSize: 13.5, marginBottom: 12 }} role="status">
            {sync.state === 'error' ? (
              <span style={{ color: 'var(--accent)' }}>{sync.message}</span>
            ) : sync.state === 'syncing' ? (
              'Sincronizando…'
            ) : (
              <>
                Sincronizado com <strong>{sync.repo}</strong>
                {when}.
              </>
            )}
          </p>
          <div className="row wrap">
            <button type="button" className="btn ghost" onClick={() => syncNow()}>
              Sincronizar agora
            </button>
            <button type="button" className="btn ghost" onClick={disconnect}>
              Desligar neste aparelho
            </button>
          </div>
        </>
      ) : (
        <form
          className="stack"
          style={{ gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            if (await connect(repo, token)) setToken('')
            setBusy(false)
          }}
        >
          <p className="muted" style={{ fontSize: 13.5 }}>
            Os dados ficam em um repositório privado seu no GitHub. Cole o token uma vez em cada aparelho; ele fica guardado só neste navegador. Se já houver dados na nuvem, eles substituem os deste aparelho.
          </p>
          <div className="form-grid">
            <Field label="Repositório privado (dono/nome)">
              <input className="input" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="GFepipy/jornada-dados" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </Field>
            <Field label="Token de acesso">
              <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" />
            </Field>
          </div>
          {sync.message && (
            <p style={{ fontSize: 13.5, color: 'var(--accent)' }} role="alert">
              {sync.message}
            </p>
          )}
          <div>
            <button type="submit" className="btn" disabled={busy || !repo.trim() || !token.trim()}>
              {busy ? 'Conectando…' : 'Ligar sincronização'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function SettingsBody() {
  const { settings: st } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `jornada-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup baixado.')
  }
  const importData = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text())
      if (!raw || typeof raw !== 'object' || !('settings' in raw)) throw new Error('formato')
      if (!confirm('Importar este backup substitui todos os dados atuais deste aparelho. Continuar?')) return
      replaceState(normalize(raw))
      setMsg('Backup importado.')
    } catch {
      setMsg('Esse arquivo não parece ser um backup do Jornada.')
    }
  }

  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Seu nome">
          <input className="input" value={st.name} onChange={(e) => update((s) => void (s.settings.name = e.target.value))} />
        </Field>
        <Field label="Tema" group>
          <Seg<Theme>
            value={st.theme}
            onChange={(v) => update((s) => void (s.settings.theme = v))}
            options={[
              { value: 'auto', label: <><Monitor size={14} /> Auto</> },
              { value: 'light', label: <><Sun size={14} /> Claro</> },
              { value: 'dark', label: <><Moon size={14} /> Escuro</> },
            ]}
          />
        </Field>
        <Field label="Meta de foco por dia (horas)">
          <input
            className="input"
            type="number"
            min={0.5}
            max={16}
            step={0.5}
            value={st.focusGoal / 60}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v > 0) update((s) => void (s.settings.focusGoal = Math.round(v * 60)))
            }}
          />
        </Field>
        <Field label="Meta de calorias por dia (kcal)">
          <input
            className="input"
            type="number"
            min={0}
            step={50}
            value={st.calorieGoal}
            onChange={(e) => update((s) => void (s.settings.calorieGoal = Math.max(0, Number(e.target.value) || 0)))}
          />
        </Field>
        <Field label="Cronograma começa às">
          <select className="select" value={st.dayStart} onChange={(e) => update((s) => void (s.settings.dayStart = Number(e.target.value)))}>
            {HOURS.filter((h) => h < st.dayEnd).map((h) => (
              <option key={h} value={h}>
                {minToHHMM(h)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cronograma termina às">
          <select className="select" value={st.dayEnd} onChange={(e) => update((s) => void (s.settings.dayEnd = Number(e.target.value)))}>
            {HOURS.filter((h) => h > st.dayStart).map((h) => (
              <option key={h} value={h}>
                {h === 1440 ? '24:00' : minToHHMM(h)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <InstallSection />

      <SyncSection />

      <div>
        <div className="label" style={{ marginBottom: 8 }}>
          Backup manual
        </div>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
          Uma cópia de segurança em arquivo, independente da sincronização.
        </p>
        <div className="row wrap">
          <button type="button" className="btn ghost" onClick={exportData}>
            <Download size={16} /> Baixar backup
          </button>
          <button type="button" className="btn ghost" onClick={() => file.current?.click()}>
            <Upload size={16} /> Importar backup
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
        {msg && (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }} role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        {confirmWipe ? (
          <>
            <span style={{ fontSize: 13.5 }}>Apagar tudo? Isso não pode ser desfeito.</span>
            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => setConfirmWipe(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn danger small"
                onClick={() => {
                  replaceState(normalize({ settings: { name: st.name, theme: st.theme } }))
                  setConfirmWipe(false)
                  setMsg('Dados apagados.')
                }}
              >
                Apagar tudo
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="btn danger small" onClick={() => setConfirmWipe(true)}>
            Apagar todos os dados
          </button>
        )}
      </div>
    </div>
  )
}
