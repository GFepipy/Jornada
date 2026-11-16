import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion, useIsPresent } from 'motion/react'
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import { addDays, fmtLong, relativeDay, todayKey } from '../lib/dates'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const ease = [0.22, 1, 0.36, 1] as const
export const spring = { type: 'spring', stiffness: 460, damping: 34 } as const
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))

/* ---------- Anel de progresso ---------- */
export function Ring({
  value,
  size = 92,
  stroke = 7,
  color,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [v, setV] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(clamp01(value)))
    return () => cancelAnimationFrame(id)
  }, [value])
  return (
    <div className={cx('ring', v >= 1 && 'full')} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ stroke: color, opacity: v > 0 ? 1 : 0 }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/* ---------- Número que desliza até o valor ---------- */
export function Num({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  const fmt = useRef(format)
  fmt.current = format
  useLayoutEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value || !ref.current) return
    ref.current.textContent = fmt.current(from)
    const ctl = animate(from, value, {
      duration: 0.7,
      ease,
      onUpdate: (x) => ref.current && (ref.current.textContent = fmt.current(x)),
    })
    return () => ctl.stop()
  }, [value])
  return <span ref={ref}>{format(value)}</span>
}

/* ---------- Checkbox redondo com traço animado ---------- */
export function Check({ checked, onChange, label, color }: { checked: boolean; onChange: (v: boolean) => void; label: string; color?: string }) {
  // a animação de “pop” só toca quando o usuário acabou de marcar, não ao abrir a tela
  const [just, setJust] = useState(false)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cx('check', checked && 'on', just && 'just')}
      style={color ? ({ '--check': color } as React.CSSProperties) : undefined}
      onClick={(e) => {
        e.stopPropagation()
        setJust(true)
        onChange(!checked)
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M3.6 8.6l2.9 2.9 5.9-6.6" />
      </svg>
    </button>
  )
}

/* ---------- Cartão ---------- */
export function Card({
  title,
  right,
  children,
  className,
  flush,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={cx('card', flush && 'flush', className)}>
      {(title || right) && (
        <header className="card-head">
          <h2>{title}</h2>
          {right && <div className="card-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function IconBtn({
  label,
  children,
  onClick,
  className,
  active,
}: {
  label: string
  children: ReactNode
  onClick?: (e: React.MouseEvent) => void
  className?: string
  active?: boolean
}) {
  return (
    <button type="button" className={cx('icon-btn', active && 'on', className)} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}

/* ---------- Controle segmentado com indicador deslizante ---------- */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  small,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  small?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('seg', small && 'small', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={cx(value === o.value && 'on')} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={id} className="seg-pill" transition={spring} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Linha de lista com entrada/saída suave ---------- */
export function Item({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      className={cx('item', className)}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  )
}

/* ---------- Cartão de grade (projetos, acervo…) ---------- */
export function Tile({
  children,
  className,
  onClick,
  label,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  label?: string
}) {
  return (
    <motion.div
      layout
      className={cx('tile', onClick && 'clickable', className)}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease, layout: spring }}
      onClick={onClick}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': label,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onClick()
              }
            },
          }
        : {})}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Modal (folha inferior no celular) ---------- */
function Backdrop({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  // enquanto o modal some, ele já não intercepta cliques
  const present = useIsPresent()
  return (
    <motion.div
      className="modal-backdrop"
      style={{ pointerEvents: present ? 'auto' : 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </motion.div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const last = useRef(children)
  if (open) last.current = children
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <Backdrop onClose={onClose}>
          <motion.div
            className={cx('modal', wide && 'wide')}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={spring}
          >
            <header className="modal-head">
              <h2>{title}</h2>
              <IconBtn label="Fechar" onClick={onClose}>
                <X size={18} />
              </IconBtn>
            </header>
            <div className="modal-body">{last.current}</div>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Campos ---------- */
export function Field({ label, children, className, group }: { label: string; children: ReactNode; className?: string; group?: boolean }) {
  // grupos de botões não podem ficar dentro de <label>: um clique no rótulo acionaria o primeiro botão
  if (group)
    return (
      <div className={cx('field', className)} role="group" aria-label={label}>
        <span>{label}</span>
        {children}
      </div>
    )
  return (
    <label className={cx('field', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 2,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  minRows?: number
  ariaLabel?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      className={cx('textarea', className)}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/* ---------- Barras ---------- */
export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(clamp01(value) * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${clamp01(value) * 100}%`, background: color }} />
    </div>
  )
}

export interface BarDatum {
  key: string
  label: string
  value: number
  active?: boolean
  title?: string
  onClick?: () => void
}
export function Bars({ data, goal, height = 110 }: { data: BarDatum[]; goal?: number; height?: number }) {
  const max = Math.max(goal ? goal * 1.1 : 0, ...data.map((d) => d.value), 1)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="bars" style={{ height: height + 22 }}>
      {goal ? <div className="bars-goal" style={{ bottom: 22 + (goal / max) * height }} /> : null}
      {data.map((d, i) => (
        <button
          type="button"
          key={d.key}
          className={cx('bars-col', d.active && 'on', goal && d.value >= goal ? 'hit' : '')}
          title={d.title}
          aria-label={d.title}
          onClick={d.onClick}
          tabIndex={d.onClick ? 0 : -1}
        >
          <div className="bars-track" style={{ height }}>
            <i style={{ height: ready ? `${(d.value / max) * 100}%` : 0, transitionDelay: `${i * 28}ms` }} />
          </div>
          <span>{d.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null
  const w = 200
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, 4 + (1 - (v - min) / span) * (height - 8)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <div className="spark" style={{ height }} aria-hidden>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <path d={d} vectorEffect="non-scaling-stroke" />
      </svg>
      <i style={{ left: `${(lx / w) * 100}%`, top: ly }} />
    </div>
  )
}

/* ---------- Diversos ---------- */
export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <p>{children}</p>
    </div>
  )
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('chip', className)} style={color ? ({ '--chip': color } as React.CSSProperties) : undefined}>
      {children}
    </span>
  )
}

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className={cx('stars', !onChange && 'readonly')} role={onChange ? 'radiogroup' : 'img'} aria-label={`Nota: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button type="button" key={n} className={cx(n <= value && 'on')} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onClick={() => onChange(n === value ? 0 : n)}>
            <Star size={size} />
          </button>
        ) : (
          <span key={n} className={cx(n <= value && 'on')}>
            <Star size={size} />
          </span>
        ),
      )}
    </div>
  )
}

/* ---------- Navegação entre dias ---------- */
export function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const rel = relativeDay(date)
  return (
    <div className="date-nav">
      <div className="date-nav-main">
        <IconBtn label="Dia anterior" onClick={() => onChange(addDays(date, -1))}>
          <ChevronLeft size={18} />
        </IconBtn>
        <div className="date-nav-label">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h1 key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease }}>
              {fmtLong(date)}
            </motion.h1>
          </AnimatePresence>
        </div>
        <IconBtn label="Próximo dia" onClick={() => onChange(addDays(date, 1))}>
          <ChevronRight size={18} />
        </IconBtn>
      </div>
      {rel !== 'Hoje' && (
        <button type="button" className="btn ghost small" onClick={() => onChange(todayKey())}>
          Voltar para hoje
        </button>
      )}
    </div>
  )
}
