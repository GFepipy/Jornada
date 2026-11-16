import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarPlus, Check as CheckIcon, Copy, ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { LibItem, LibKind, Project, ProjectStatus, PTaskStatus } from '../types'
import { addTask, update, useApp } from '../store'
import { diffDays, fmtShort, todayKey, uid } from '../lib/dates'
import { LIB_KINDS, PROJECT_STATUS, PTASK_COLS } from '../lib/meta'
import { TopBar } from '../components/shell'
import { AutoTextarea, Card, Check, Chip, Empty, Field, IconBtn, Item, List, Modal, Progress, Seg, Tile, cx, ease, spring } from '../components/ui'

type View = 'projetos' | 'biblioteca'

const safeUrl = (u: string) => {
  const v = u.trim()
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^[a-z]+:/i, '')}`
}
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

const deadlineText = (d: string) => {
  if (!d) return null
  const n = diffDays(d, todayKey())
  if (n === 0) return { text: 'entrega hoje', late: true }
  if (n < 0) return { text: `atrasado ${-n} ${n === -1 ? 'dia' : 'dias'}`, late: true }
  return { text: n <= 14 ? `em ${n} ${n === 1 ? 'dia' : 'dias'}` : fmtShort(d), late: false }
}

export default function Gafero() {
  const s = useApp()
  const g = s.gafero
  const [view, setView] = useState<View>('projetos')
  const [openId, setOpenId] = useState<string | null>(null)
  const project = g.projects.find((p) => p.id === openId)

  const active = g.projects.filter((p) => p.status === 'ativo')
  const openTasks = active.reduce((a, p) => a + p.tasks.filter((t) => t.status !== 'done').length, 0)
  const finished = g.projects.filter((p) => p.status === 'concluido').length

  const createProject = () => {
    const id = uid()
    update((st) => void st.gafero.projects.unshift({ id, name: '', client: '', status: 'ativo', deadline: '', description: '', tasks: [], notes: [], links: [], createdAt: Date.now() }))
    setOpenId(id)
  }

  return (
    <>
      <TopBar eyebrow="Marketing e infraestrutura de vendas com IA" title="Gafero" />
      <AnimatePresence mode="wait" initial={false}>
        {project ? (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22, ease }}>
            <ProjectDetail p={project} onBack={() => setOpenId(null)} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease }}>
            <div className="stat-tiles">
              <div className="stat">
                <strong className="serif num">{active.length}</strong>
                <span>{active.length === 1 ? 'projeto ativo' : 'projetos ativos'}</span>
              </div>
              <div className="stat">
                <strong className="serif num">{openTasks}</strong>
                <span>{openTasks === 1 ? 'tarefa em aberto' : 'tarefas em aberto'}</span>
              </div>
              <div className="stat">
                <strong className="serif num">{finished}</strong>
                <span>{finished === 1 ? 'projeto concluído' : 'projetos concluídos'}</span>
              </div>
              <div className="stat">
                <strong className="serif num">{g.library.length}</strong>
                <span>{g.library.length === 1 ? 'item na biblioteca' : 'itens na biblioteca'}</span>
              </div>
            </div>

            <div className="subnav">
              <Seg<View>
                value={view}
                onChange={setView}
                options={[
                  { value: 'projetos', label: 'Projetos' },
                  { value: 'biblioteca', label: 'Biblioteca' },
                ]}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease }}>
                {view === 'projetos' && <Projects projects={g.projects} onOpen={setOpenId} onCreate={createProject} />}
                {view === 'biblioteca' && <Library items={g.library} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ================= Projetos ================= */

function Projects({ projects, onOpen, onCreate }: { projects: Project[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const order: ProjectStatus[] = ['ativo', 'pausado', 'concluido']
  const sorted = [...projects].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.createdAt - a.createdAt)
  return (
    <div className="grid-tiles">
      <AnimatePresence mode="popLayout" initial={false}>
        {sorted.map((p) => {
          const done = p.tasks.filter((t) => t.status === 'done').length
          const dl = p.status === 'concluido' ? null : deadlineText(p.deadline)
          return (
            <Tile key={p.id} onClick={() => onOpen(p.id)} label={`Abrir projeto ${p.name}`}>
              <div className="row">
                <Chip color={PROJECT_STATUS[p.status].color}>{PROJECT_STATUS[p.status].label}</Chip>
                <span className="grow" />
                {dl && <span className={cx('tile-note', dl.late && 'late')}>{dl.text}</span>}
              </div>
              <h3 className="tile-title serif">{p.name || 'Projeto sem nome'}</h3>
              <p className="tile-sub">{p.client || 'Sem cliente definido'}</p>
              <Progress value={p.tasks.length ? done / p.tasks.length : 0} />
              <div className="tile-foot num">
                <span>{p.tasks.length ? `${done} de ${p.tasks.length} tarefas` : 'Sem tarefas ainda'}</span>
                <span>{p.tasks.length ? `${Math.round((done / p.tasks.length) * 100)}%` : ''}</span>
              </div>
            </Tile>
          )
        })}
        <Tile key="new" className="dashed" onClick={onCreate} label="Novo projeto">
          <span className="row">
            <Plus size={18} /> Novo projeto
          </span>
        </Tile>
      </AnimatePresence>
    </div>
  )
}

function ProjectDetail({ p, onBack }: { p: Project; onBack: () => void }) {
  const s = useApp()
  const today = todayKey()
  const [task, setTask] = useState('')
  const [link, setLink] = useState({ title: '', url: '' })
  const [confirmDel, setConfirmDel] = useState(false)
  const patch = (fn: (x: Project) => void) =>
    update((st) => {
      const x = st.gafero.projects.find((y) => y.id === p.id)
      if (x) fn(x)
    })
  const done = p.tasks.filter((t) => t.status === 'done').length
  const sentToday = new Set(s.tasks.filter((t) => t.date === today && t.ref?.projectId === p.id).map((t) => t.ref!.taskId))
  const move = (id: string, status: PTaskStatus) => patch((x) => void (x.tasks.find((t) => t.id === id)!.status = status))
  const dl = deadlineText(p.deadline)

  return (
    <div className="proj">
      <div className="row proj-bar">
        <button type="button" className="btn ghost small" onClick={onBack}>
          <ArrowLeft size={15} /> Projetos
        </button>
        <span className="grow" />
        {confirmDel ? (
          <>
            <span className="muted" style={{ fontSize: 13 }}>
              Excluir o projeto?
            </span>
            <button type="button" className="btn ghost small" onClick={() => setConfirmDel(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn danger small"
              onClick={() => {
                onBack()
                update((st) => void (st.gafero.projects = st.gafero.projects.filter((x) => x.id !== p.id)))
              }}
            >
              Excluir
            </button>
          </>
        ) : (
          <IconBtn label="Excluir projeto" onClick={() => setConfirmDel(true)}>
            <Trash2 size={16} />
          </IconBtn>
        )}
      </div>

      <input className="proj-name serif" value={p.name} autoFocus={!p.name} placeholder="Nome do projeto" aria-label="Nome do projeto" onChange={(e) => patch((x) => void (x.name = e.target.value))} />

      <div className="proj-meta">
        <Field label="Cliente">
          <input className="input" value={p.client} placeholder="Para quem é?" onChange={(e) => patch((x) => void (x.client = e.target.value))} />
        </Field>
        <Field label="Status">
          <select className="select" value={p.status} onChange={(e) => patch((x) => void (x.status = e.target.value as ProjectStatus))}>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dl && p.status !== 'concluido' ? `Prazo · ${dl.text}` : 'Prazo'}>
          <input className="input" type="date" value={p.deadline} onChange={(e) => patch((x) => void (x.deadline = e.target.value))} />
        </Field>
        <div className="proj-progress">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Progresso</span>
            <span className="num">{p.tasks.length ? `${Math.round((done / p.tasks.length) * 100)}%` : '—'}</span>
          </div>
          <Progress value={p.tasks.length ? done / p.tasks.length : 0} />
        </div>
      </div>

      <AutoTextarea
        className="plain proj-desc"
        value={p.description}
        onChange={(v) => patch((x) => void (x.description = v))}
        placeholder="Objetivo, escopo, contexto do cliente, entregáveis…"
        ariaLabel="Descrição do projeto"
      />

      <Card title="Tarefas" right={p.tasks.length > 0 && <span className="num">{done} de {p.tasks.length}</span>}>
        <form
          className="inline-add"
          onSubmit={(e) => {
            e.preventDefault()
            const t = task.trim()
            if (!t) return
            patch((x) => void x.tasks.push({ id: uid(), title: t, status: 'todo' }))
            setTask('')
          }}
        >
          <input className="input" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Nova tarefa do projeto…" aria-label="Nova tarefa do projeto" />
          <button type="submit" className="btn add-btn" aria-label="Adicionar tarefa" disabled={!task.trim()}>
            <Plus size={18} />
          </button>
        </form>
        <LayoutGroup>
          <div className="kanban">
            {PTASK_COLS.map((col, ci) => {
              const items = p.tasks.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="kcol">
                  <div className="kcol-head">
                    <span className="label">{col.label}</span>
                    <span className="num muted">{items.length}</span>
                  </div>
                  {items.map((t) => (
                    <motion.div key={t.id} layout layoutId={`pt-${t.id}`} transition={spring} className={cx('ktask', t.status === 'done' && 'done')}>
                      <Check checked={t.status === 'done'} onChange={(v) => move(t.id, v ? 'done' : 'todo')} label={`Concluir: ${t.title}`} />
                      <span className="grow ktask-title">{t.title}</span>
                      <div className="ktask-actions">
                        {ci > 0 && (
                          <IconBtn label={`Mover para ${PTASK_COLS[ci - 1].label}`} onClick={() => move(t.id, PTASK_COLS[ci - 1].id)}>
                            <ArrowLeft size={14} />
                          </IconBtn>
                        )}
                        {ci < 2 && (
                          <IconBtn label={`Mover para ${PTASK_COLS[ci + 1].label}`} onClick={() => move(t.id, PTASK_COLS[ci + 1].id)}>
                            <ArrowRight size={14} />
                          </IconBtn>
                        )}
                        {t.status !== 'done' &&
                          (sentToday.has(t.id) ? (
                            <span className="icon-btn sent" title="Já está nas tarefas de hoje">
                              <CheckIcon size={14} />
                            </span>
                          ) : (
                            <IconBtn
                              label="Enviar para as tarefas de hoje"
                              onClick={() => {
                                addTask(today, t.title, 30, 'gafero', { projectId: p.id, taskId: t.id })
                                if (t.status === 'todo') move(t.id, 'doing')
                              }}
                            >
                              <CalendarPlus size={14} />
                            </IconBtn>
                          ))}
                        <IconBtn label="Excluir tarefa" onClick={() => patch((x) => void (x.tasks = x.tasks.filter((y) => y.id !== t.id)))}>
                          <X size={14} />
                        </IconBtn>
                      </div>
                    </motion.div>
                  ))}
                  {items.length === 0 && <div className="kcol-empty">—</div>}
                </div>
              )
            })}
          </div>
        </LayoutGroup>
      </Card>

      <div className="proj-grid">
        <Card
          title="Notas"
          right={
            <button type="button" className="btn ghost small" onClick={() => patch((x) => void x.notes.unshift({ id: uid(), title: '', body: '', updatedAt: Date.now() }))}>
              <Plus size={14} /> Nota
            </button>
          }
        >
          <List>
            {p.notes.map((n) => (
              <Item key={n.id}>
                <div className="note-item">
                  <div className="row">
                    <input
                      className="note-title grow"
                      value={n.title}
                      placeholder="Título da nota"
                      aria-label="Título da nota"
                      onChange={(e) => patch((x) => void Object.assign(x.notes.find((y) => y.id === n.id)!, { title: e.target.value, updatedAt: Date.now() }))}
                    />
                    <IconBtn label="Excluir nota" onClick={() => patch((x) => void (x.notes = x.notes.filter((y) => y.id !== n.id)))}>
                      <X size={14} />
                    </IconBtn>
                  </div>
                  <AutoTextarea
                    className="plain"
                    value={n.body}
                    placeholder="Reuniões, decisões, briefing, ideias de campanha…"
                    ariaLabel="Texto da nota"
                    onChange={(v) => patch((x) => void Object.assign(x.notes.find((y) => y.id === n.id)!, { body: v, updatedAt: Date.now() }))}
                  />
                </div>
              </Item>
            ))}
          </List>
          {p.notes.length === 0 && <Empty>Um espaço livre para escrever sobre o projeto.</Empty>}
        </Card>

        <Card title="Links">
          <form
            className="link-add"
            onSubmit={(e) => {
              e.preventDefault()
              if (!link.url.trim()) return
              const url = safeUrl(link.url)
              patch((x) => void x.links.push({ id: uid(), title: link.title.trim() || host(url), url }))
              setLink({ title: '', url: '' })
            }}
          >
            <input className="input" value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="Título" aria-label="Título do link" />
            <input className="input" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" aria-label="Endereço do link" inputMode="url" />
            <button type="submit" className="btn add-btn" aria-label="Adicionar link" disabled={!link.url.trim()}>
              <Plus size={18} />
            </button>
          </form>
          <List>
            {p.links.map((l) => (
              <Item key={l.id}>
                <div className="link-row">
                  <a href={l.url} target="_blank" rel="noreferrer noopener" className="grow">
                    <strong>{l.title}</strong>
                    <span>{host(l.url)}</span>
                  </a>
                  <ExternalLink size={14} className="muted" />
                  <IconBtn label="Excluir link" onClick={() => patch((x) => void (x.links = x.links.filter((y) => y.id !== l.id)))}>
                    <X size={14} />
                  </IconBtn>
                </div>
              </Item>
            ))}
          </List>
          {p.links.length === 0 && <Empty>Drive, Figma, painel de anúncios, CRM do cliente, automações…</Empty>}
        </Card>
      </div>
    </div>
  )
}

/* ================= Biblioteca ================= */

const blankLib = (): LibItem => ({ id: '', kind: 'prompt', title: '', body: '', createdAt: Date.now() })

function Library({ items }: { items: LibItem[] }) {
  const [kind, setKind] = useState<LibKind | 'tudo'>('tudo')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<LibItem | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const query = q.trim().toLowerCase()
  const shown = items
    .filter((i) => (kind === 'tudo' || i.kind === kind) && (!query || i.title.toLowerCase().includes(query) || i.body.toLowerCase().includes(query)))
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <button type="button" className="btn" onClick={() => setEditing({ ...blankLib(), kind: kind === 'tudo' ? 'prompt' : kind })}>
          <Plus size={16} /> Novo item
        </button>
        <Seg<LibKind | 'tudo'>
          small
          value={kind}
          onChange={setKind}
          options={[{ value: 'tudo', label: 'Tudo' }, ...(Object.keys(LIB_KINDS) as LibKind[]).map((k) => ({ value: k, label: LIB_KINDS[k].plural }))]}
        />
        <label className="search grow">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na biblioteca…" aria-label="Buscar na biblioteca" />
        </label>
      </div>
      <div className="grid-tiles">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((i) => (
            <Tile key={i.id} className="lib">
              <div className="row">
                <Chip>{LIB_KINDS[i.kind].label}</Chip>
                <span className="grow" />
                {i.kind === 'link' ? (
                  <a className="icon-btn" href={safeUrl(i.body)} target="_blank" rel="noreferrer noopener" aria-label="Abrir link" title="Abrir link">
                    <ExternalLink size={15} />
                  </a>
                ) : null}
                <IconBtn
                  label="Copiar"
                  onClick={() => {
                    copyText(i.body)
                    setCopied(i.id)
                    setTimeout(() => setCopied((c) => (c === i.id ? null : c)), 1400)
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={copied === i.id ? 'ok' : 'copy'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }} style={{ display: 'grid' }}>
                      {copied === i.id ? <CheckIcon size={15} /> : <Copy size={15} />}
                    </motion.span>
                  </AnimatePresence>
                </IconBtn>
                <IconBtn label="Editar" onClick={() => setEditing(i)}>
                  <Pencil size={14} />
                </IconBtn>
              </div>
              <h3 className="tile-title serif">{i.title || 'Sem título'}</h3>
              <p className="lib-body">{i.body}</p>
            </Tile>
          ))}
        </AnimatePresence>
      </div>
      {shown.length === 0 && (
        <Empty>{items.length === 0 ? 'Guarde aqui os prompts que funcionam, scripts de abordagem, processos da operação e links úteis — tudo a um clique de copiar.' : 'Nada encontrado com esse filtro.'}</Empty>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar item' : 'Novo item'} wide>
        {editing && <LibForm key={editing.id || 'new'} initial={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  )
}

function LibForm({ initial, onClose }: { initial: LibItem; onClose: () => void }) {
  const [f, setF] = useState(initial)
  const valid = f.title.trim() || f.body.trim()
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    update((st) => {
      if (f.id) {
        const i = st.gafero.library.findIndex((x) => x.id === f.id)
        if (i >= 0) st.gafero.library[i] = f
      } else st.gafero.library.push({ ...f, id: uid(), createdAt: Date.now() })
    })
    onClose()
  }
  return (
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Título">
          <input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <select className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as LibKind })}>
            {(Object.keys(LIB_KINDS) as LibKind[]).map((k) => (
              <option key={k} value={k}>
                {LIB_KINDS[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={f.kind === 'link' ? 'Endereço' : 'Conteúdo'} className="full">
          {f.kind === 'link' ? (
            <input className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="https://…" inputMode="url" />
          ) : (
            <AutoTextarea value={f.body} onChange={(v) => setF({ ...f, body: v })} minRows={8} placeholder="Cole ou escreva aqui…" />
          )}
        </Field>
      </div>
      <div className="form-actions">
        {f.id ? (
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              update((st) => void (st.gafero.library = st.gafero.library.filter((x) => x.id !== f.id)))
              onClose()
            }}
          >
            Excluir
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btn" disabled={!valid}>
          Salvar
        </button>
      </div>
    </form>
  )
}
