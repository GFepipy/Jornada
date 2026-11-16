import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, ExternalLink, Film, Gamepad2, Landmark, Lightbulb, Music, Plus, Shapes, Sparkles, Tv, X } from 'lucide-react'
import type { ArtItem, ArtKind, ArtProject, ArtProjectStatus, ArtStatus } from '../types'
import { update, useApp } from '../store'
import { fmtShort, todayKey, uid } from '../lib/dates'
import { ART_KINDS, ART_PROJECT_STATUS, ART_STATUS } from '../lib/meta'
import { TopBar } from '../components/shell'
import { AutoTextarea, Card, Check, Chip, Empty, Field, IconBtn, Item, List, Modal, Progress, Seg, Stars, Tile, cx, ease } from '../components/ui'

type View = 'acervo' | 'criacao'
const KIND_ICON: Record<ArtKind, typeof Film> = { filme: Film, serie: Tv, livro: BookOpen, musica: Music, jogo: Gamepad2, exposicao: Landmark, outro: Shapes }
const KINDS = Object.keys(ART_KINDS) as ArtKind[]
const PROMPTS = ['O que mais me marcou?', 'Como isso me fez sentir?', 'O que eu levaria para o meu próprio trabalho?', 'Que escolha eu teria feito diferente?']

const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim().replace(/^[a-z]+:/i, '')}`)

export default function Art() {
  const s = useApp()
  const a = s.art
  const [view, setView] = useState<View>('acervo')
  const year = todayKey().slice(0, 4)
  const doneYear = a.items.filter((i) => i.status === 'concluido' && i.date.startsWith(year)).length
  const reflected = a.items.filter((i) => i.thoughts.trim().length > 0).length

  return (
    <>
      <TopBar eyebrow="O que eu consumo e o que eu crio" title="Arte" />
      <div className="stat-tiles">
        <div className="stat">
          <strong className="serif num">{doneYear}</strong>
          <span>{doneYear === 1 ? 'obra concluída' : 'obras concluídas'} em {year}</span>
        </div>
        <div className="stat">
          <strong className="serif num">{reflected}</strong>
          <span>{reflected === 1 ? 'reflexão escrita' : 'reflexões escritas'}</span>
        </div>
        <div className="stat">
          <strong className="serif num">{a.projects.filter((p) => p.status === 'desenvolvimento').length}</strong>
          <span>em desenvolvimento</span>
        </div>
        <div className="stat">
          <strong className="serif num">{a.ideas.length}</strong>
          <span>{a.ideas.length === 1 ? 'ideia guardada' : 'ideias guardadas'}</span>
        </div>
      </div>
      <div className="subnav">
        <Seg<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'acervo', label: 'Acervo' },
            { value: 'criacao', label: 'Criação' },
          ]}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease }}>
          {view === 'acervo' ? <Collection items={a.items} /> : <Creation />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

/* ================= Acervo ================= */

function Collection({ items }: { items: ArtItem[] }) {
  const [status, setStatus] = useState<ArtStatus | 'tudo'>('tudo')
  const [kind, setKind] = useState<ArtKind | 'tudo'>('tudo')
  const [openId, setOpenId] = useState<string | null>(null)
  const shown = items.filter((i) => (status === 'tudo' || i.status === status) && (kind === 'tudo' || i.kind === kind)).sort((a, b) => b.createdAt - a.createdAt)

  const create = () => {
    const id = uid()
    update((st) =>
      void st.art.items.push({
        id,
        title: '',
        creator: '',
        kind: kind === 'tudo' ? 'filme' : kind,
        status: status === 'tudo' ? 'concluido' : status,
        rating: 0,
        date: todayKey(),
        link: '',
        thoughts: '',
        createdAt: Date.now(),
      }),
    )
    setOpenId(id)
  }
  // ao fechar, descarta itens que ficaram totalmente em branco
  const close = () => {
    const id = openId
    setOpenId(null)
    update((st) => void (st.art.items = st.art.items.filter((i) => i.id !== id || i.title.trim() || i.thoughts.trim())))
  }

  return (
    <>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <button type="button" className="btn" onClick={create}>
          <Plus size={16} /> Adicionar obra
        </button>
        <Seg<ArtStatus | 'tudo'>
          small
          value={status}
          onChange={setStatus}
          options={[{ value: 'tudo', label: 'Tudo' }, ...(Object.keys(ART_STATUS) as ArtStatus[]).map((k) => ({ value: k, label: ART_STATUS[k] }))]}
        />
        <select className="select kind-filter" value={kind} onChange={(e) => setKind(e.target.value as ArtKind | 'tudo')} aria-label="Filtrar por tipo">
          <option value="tudo">Todos os tipos</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {ART_KINDS[k].plural}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-tiles">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((i) => {
            const Icon = KIND_ICON[i.kind]
            return (
              <Tile key={i.id} className="art-tile" onClick={() => setOpenId(i.id)} label={`Abrir ${i.title}`}>
                <div className="row">
                  <span className="art-kind">
                    <Icon size={14} strokeWidth={1.7} /> {ART_KINDS[i.kind].label}
                  </span>
                  <span className="grow" />
                  {i.status === 'concluido' ? i.rating > 0 && <Stars value={i.rating} size={13} /> : <Chip>{ART_STATUS[i.status]}</Chip>}
                </div>
                <h3 className="tile-title serif">{i.title || 'Sem título'}</h3>
                <p className="tile-sub">{[i.creator, i.status === 'concluido' && i.date ? fmtShort(i.date) : ''].filter(Boolean).join(' · ') || ' '}</p>
                {i.thoughts.trim() && <p className="art-quote serif">{i.thoughts.trim()}</p>}
              </Tile>
            )
          })}
        </AnimatePresence>
      </div>
      {shown.length === 0 && (
        <Empty>{items.length === 0 ? 'Filmes, livros, discos, jogos, exposições: registre o que você consome e escreva o que ficou de cada obra.' : 'Nada por aqui com esse filtro.'}</Empty>
      )}

      <Modal open={!!openId} onClose={close} title="Obra" wide>
        {openId && <ItemEditor id={openId} onClose={close} />}
      </Modal>
    </>
  )
}

function ItemEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const item = useApp().art.items.find((i) => i.id === id)
  if (!item) return null
  const patch = (p: Partial<ArtItem>) =>
    update((st) => {
      const x = st.art.items.find((i) => i.id === id)
      if (x) Object.assign(x, p)
    })
  return (
    <div className="stack">
      <input className="big-title serif" autoFocus={!item.title} value={item.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Título da obra" aria-label="Título da obra" />
      <div className="form-grid">
        <Field label="Autor, diretor, artista…">
          <input className="input" value={item.creator} onChange={(e) => patch({ creator: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <select className="select" value={item.kind} onChange={(e) => patch({ kind: e.target.value as ArtKind })}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {ART_KINDS[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Situação" className="full" group>
          <Seg<ArtStatus>
            value={item.status}
            onChange={(v) => patch({ status: v, date: v === 'concluido' && !item.date ? todayKey() : item.date })}
            options={(Object.keys(ART_STATUS) as ArtStatus[]).map((k) => ({ value: k, label: ART_STATUS[k] }))}
          />
        </Field>
        <Field label="Quando">
          <input className="input" type="date" value={item.date} onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label="Minha nota" group>
          <div className="stars-field">
            <Stars value={item.rating} onChange={(v) => patch({ rating: v })} size={22} />
          </div>
        </Field>
        <Field label="Link (opcional)" className="full" group>
          <div className="row">
            <input className="input" value={item.link} onChange={(e) => patch({ link: e.target.value })} placeholder="https://…" inputMode="url" />
            {item.link.trim() && (
              <a className="icon-btn" href={safeUrl(item.link)} target="_blank" rel="noreferrer noopener" aria-label="Abrir link" title="Abrir link">
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </Field>
      </div>

      <div>
        <div className="label" style={{ marginBottom: 8 }}>
          Reflexão
        </div>
        <div className="row wrap prompts">
          {PROMPTS.map((p) => (
            <button key={p} type="button" className="btn ghost small" onClick={() => patch({ thoughts: `${item.thoughts.trimEnd()}${item.thoughts.trim() ? '\n\n' : ''}${p}\n` })}>
              {p}
            </button>
          ))}
        </div>
        <AutoTextarea className="essay serif" minRows={6} value={item.thoughts} onChange={(v) => patch({ thoughts: v })} placeholder="Escreva livremente sobre a obra…" ariaLabel="Reflexão sobre a obra" />
      </div>

      <div className="form-actions" style={{ marginTop: 0 }}>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            update((st) => void (st.art.items = st.art.items.filter((i) => i.id !== id)))
            onClose()
          }}
        >
          Excluir
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Pronto
        </button>
      </div>
    </div>
  )
}

/* ================= Criação ================= */

function Creation() {
  const { art } = useApp()
  const [idea, setIdea] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const order: ArtProjectStatus[] = ['desenvolvimento', 'ideia', 'finalizado']
  const projects = [...art.projects].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.updatedAt - a.updatedAt)

  const createProject = (seed = '') => {
    const id = uid()
    update((st) => void st.art.projects.push({ id, title: '', medium: '', status: 'ideia', concept: seed, steps: [], refs: [], notes: '', updatedAt: Date.now() }))
    setOpenId(id)
    return id
  }
  const close = () => {
    const id = openId
    setOpenId(null)
    update((st) => void (st.art.projects = st.art.projects.filter((p) => p.id !== id || p.title.trim() || p.concept.trim() || p.notes.trim() || p.steps.length)))
  }

  return (
    <div className="two-col creation">
      <div className="col col-a">
        <Card title="Ideias soltas" right={art.ideas.length > 0 && <span className="num">{art.ideas.length}</span>}>
          <form
            className="idea-add"
            onSubmit={(e) => {
              e.preventDefault()
              const t = idea.trim()
              if (!t) return
              update((st) => void st.art.ideas.unshift({ id: uid(), text: t, createdAt: Date.now() }))
              setIdea('')
            }}
          >
            <AutoTextarea value={idea} onChange={setIdea} minRows={2} placeholder="Uma imagem, uma frase, um tema, um “e se…”. Anote antes que escape." ariaLabel="Nova ideia" />
            <button type="submit" className="btn" disabled={!idea.trim()}>
              <Lightbulb size={16} /> Guardar ideia
            </button>
          </form>
          <List className="ideas">
            {art.ideas.map((i) => (
              <Item key={i.id}>
                <div className="idea">
                  <p className="serif">{i.text}</p>
                  <div className="row">
                    <span className="muted num grow">{new Date(i.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}</span>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => {
                        createProject(i.text)
                        update((st) => void (st.art.ideas = st.art.ideas.filter((x) => x.id !== i.id)))
                      }}
                    >
                      <Sparkles size={13} /> Virar projeto
                    </button>
                    <IconBtn label="Excluir ideia" onClick={() => update((st) => void (st.art.ideas = st.art.ideas.filter((x) => x.id !== i.id)))}>
                      <X size={14} />
                    </IconBtn>
                  </div>
                </div>
              </Item>
            ))}
          </List>
        </Card>
      </div>

      <div className="col col-b">
        <div className="grid-tiles narrow">
          <AnimatePresence mode="popLayout" initial={false}>
            {projects.map((p) => {
              const done = p.steps.filter((x) => x.done).length
              return (
                <Tile key={p.id} onClick={() => setOpenId(p.id)} label={`Abrir projeto ${p.title}`}>
                  <div className="row">
                    <Chip color={p.status === 'desenvolvimento' ? 'var(--accent)' : p.status === 'finalizado' ? 'var(--c-saude)' : undefined}>{ART_PROJECT_STATUS[p.status]}</Chip>
                    <span className="grow" />
                    {p.refs.length > 0 && <span className="tile-note">{p.refs.length} {p.refs.length === 1 ? 'referência' : 'referências'}</span>}
                  </div>
                  <h3 className="tile-title serif">{p.title || 'Projeto sem título'}</h3>
                  <p className="tile-sub">{p.medium || 'Formato a definir'}</p>
                  {p.steps.length > 0 && (
                    <>
                      <Progress value={done / p.steps.length} />
                      <div className="tile-foot num">
                        <span>
                          {done} de {p.steps.length} passos
                        </span>
                      </div>
                    </>
                  )}
                </Tile>
              )
            })}
            <Tile key="new" className="dashed" onClick={() => createProject()} label="Novo projeto de criação">
              <span className="row">
                <Plus size={18} /> Novo projeto
              </span>
            </Tile>
          </AnimatePresence>
        </div>
      </div>

      <Modal open={!!openId} onClose={close} title="Projeto de criação" wide>
        {openId && <ProjectEditor id={openId} onClose={close} />}
      </Modal>
    </div>
  )
}

function ProjectEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { art } = useApp()
  const [step, setStep] = useState('')
  const p = art.projects.find((x) => x.id === id)
  if (!p) return null
  const patch = (fn: (x: ArtProject) => void) =>
    update((st) => {
      const x = st.art.projects.find((y) => y.id === id)
      if (x) {
        fn(x)
        x.updatedAt = Date.now()
      }
    })
  const available = art.items.filter((i) => i.title.trim() && !p.refs.includes(i.id))
  return (
    <div className="stack">
      <input className="big-title serif" autoFocus={!p.title} value={p.title} onChange={(e) => patch((x) => void (x.title = e.target.value))} placeholder="Título do projeto" aria-label="Título do projeto" />
      <div className="form-grid">
        <Field label="Formato">
          <input className="input" value={p.medium} onChange={(e) => patch((x) => void (x.medium = e.target.value))} placeholder="Curta, série de fotos, música, ensaio…" />
        </Field>
        <Field label="Fase">
          <select className="select" value={p.status} onChange={(e) => patch((x) => void (x.status = e.target.value as ArtProjectStatus))}>
            {(Object.keys(ART_PROJECT_STATUS) as ArtProjectStatus[]).map((k) => (
              <option key={k} value={k}>
                {ART_PROJECT_STATUS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conceito" className="full">
          <AutoTextarea className="essay serif" minRows={3} value={p.concept} onChange={(v) => patch((x) => void (x.concept = v))} placeholder="Qual é a ideia central? O que você quer provocar em quem vê?" />
        </Field>
      </div>

      <div>
        <div className="label" style={{ marginBottom: 8 }}>
          Próximos passos
        </div>
        <List>
          {p.steps.map((st) => (
            <Item key={st.id}>
              <div className={cx('step', st.done && 'done')}>
                <Check checked={st.done} onChange={(v) => patch((x) => void (x.steps.find((y) => y.id === st.id)!.done = v))} label={`Concluir: ${st.title}`} />
                <span className="grow">{st.title}</span>
                <IconBtn label="Excluir passo" onClick={() => patch((x) => void (x.steps = x.steps.filter((y) => y.id !== st.id)))}>
                  <X size={14} />
                </IconBtn>
              </div>
            </Item>
          ))}
        </List>
        <form
          className="inline-add"
          onSubmit={(e) => {
            e.preventDefault()
            const t = step.trim()
            if (!t) return
            patch((x) => void x.steps.push({ id: uid(), title: t, done: false }))
            setStep('')
          }}
        >
          <input className="input" value={step} onChange={(e) => setStep(e.target.value)} placeholder="Adicionar passo…" aria-label="Novo passo" />
          <button type="submit" className="btn add-btn" aria-label="Adicionar passo" disabled={!step.trim()}>
            <Plus size={18} />
          </button>
        </form>
      </div>

      <div>
        <div className="label" style={{ marginBottom: 8 }}>
          Referências do acervo
        </div>
        <div className="row wrap refs">
          <AnimatePresence initial={false}>
            {p.refs.map((rid) => {
              const it = art.items.find((i) => i.id === rid)
              if (!it) return null
              return (
                <motion.span key={rid} className="ref" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.18 }}>
                  {it.title}
                  <button type="button" aria-label={`Remover referência ${it.title}`} onClick={() => patch((x) => void (x.refs = x.refs.filter((y) => y !== rid)))}>
                    <X size={12} />
                  </button>
                </motion.span>
              )
            })}
          </AnimatePresence>
          {available.length > 0 ? (
            <select className="select ref-add" value="" onChange={(e) => e.target.value && patch((x) => void x.refs.push(e.target.value))} aria-label="Adicionar referência do acervo">
              <option value="">Adicionar referência…</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          ) : (
            p.refs.length === 0 && <span className="muted" style={{ fontSize: 13.5 }}>As obras do seu acervo aparecem aqui para você ligar inspirações ao projeto.</span>
          )}
        </div>
      </div>

      <Field label="Caderno">
        <AutoTextarea minRows={4} value={p.notes} onChange={(v) => patch((x) => void (x.notes = v))} placeholder="Rascunhos, trechos, decisões, dúvidas…" />
      </Field>

      <div className="form-actions" style={{ marginTop: 0 }}>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            update((st) => void (st.art.projects = st.art.projects.filter((x) => x.id !== id)))
            onClose()
          }}
        >
          Excluir
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Pronto
        </button>
      </div>
    </div>
  )
}
