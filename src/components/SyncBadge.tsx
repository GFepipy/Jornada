import { useContext } from 'react'
import { Cloud, CloudAlert, CloudOff, RefreshCw } from 'lucide-react'
import { useSync } from '../sync'
import { ShellCtx } from './shell'
import { IconBtn } from './ui'

/** Estado da sincronização, sempre visível no topo. Abre as configurações ao clicar. */
export function SyncBadge() {
  const { state, message } = useSync()
  const { openSettings } = useContext(ShellCtx)
  const label =
    state === 'off' ? 'Sincronização desligada' : state === 'syncing' ? 'Sincronizando…' : state === 'ok' ? 'Sincronizado' : `Erro de sincronização: ${message}`
  return (
    <IconBtn label={label} onClick={openSettings} className={`sync-badge ${state}`}>
      {state === 'off' ? <CloudOff size={18} /> : state === 'syncing' ? <RefreshCw size={17} className="spin" /> : state === 'ok' ? <Cloud size={18} /> : <CloudAlert size={18} />}
    </IconBtn>
  )
}
