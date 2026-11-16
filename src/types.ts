export type Area = 'gafero' | 'saude' | 'arte' | 'pessoal'
export type Tab = 'inicio' | 'gafero' | 'saude' | 'arte'
export type Theme = 'auto' | 'light' | 'dark'

/* ---------- Início ---------- */
export interface Task {
  id: string
  date: string // AAAA-MM-DD
  title: string
  done: boolean
  duration: number // minutos
  start: number // minutos desde 00:00
  area: Area
  notes?: string // anotações livres da tarefa
  ref?: { projectId: string; taskId: string } // tarefa vinda de um projeto do Gafero
}

export interface Session {
  id: string
  date: string
  start: number // epoch ms
  end: number
  taskId: string | null
}

export interface Habit {
  id: string
  name: string
  createdAt: string
}

export interface DayNote {
  intention: string
  note: string
}

export interface Settings {
  name: string
  theme: Theme
  dayStart: number // minutos
  dayEnd: number
  focusGoal: number // minutos por dia
  calorieGoal: number
}

/* ---------- Gafero ---------- */
export type ProjectStatus = 'ativo' | 'pausado' | 'concluido'
export type PTaskStatus = 'todo' | 'doing' | 'done'
export interface PTask {
  id: string
  title: string
  status: PTaskStatus
}
export interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}
export interface LinkItem {
  id: string
  title: string
  url: string
}
export interface Project {
  id: string
  name: string
  client: string
  status: ProjectStatus
  deadline: string
  description: string
  tasks: PTask[]
  notes: Note[]
  links: LinkItem[]
  createdAt: number
}
export type LibKind = 'prompt' | 'script' | 'link' | 'processo'
export interface LibItem {
  id: string
  kind: LibKind
  title: string
  body: string
  createdAt: number
}

/* ---------- Saúde ---------- */
export type WorkoutType = 'forca' | 'cardio' | 'calistenia'
export interface Workout {
  id: string
  name: string
  type: WorkoutType
  minutes: number
}
export interface HealthDay {
  calories: number | null
  weight: number | null
  workouts: Workout[]
}

/* ---------- Arte ---------- */
export type ArtKind = 'filme' | 'serie' | 'livro' | 'musica' | 'jogo' | 'exposicao' | 'outro'
export type ArtStatus = 'quero' | 'andamento' | 'concluido'
export interface ArtItem {
  id: string
  title: string
  creator: string
  kind: ArtKind
  status: ArtStatus
  rating: number // 0–5
  date: string
  link: string
  thoughts: string
  createdAt: number
}
export interface Idea {
  id: string
  text: string
  createdAt: number
}
export type ArtProjectStatus = 'ideia' | 'desenvolvimento' | 'finalizado'
export interface ArtProject {
  id: string
  title: string
  medium: string
  status: ArtProjectStatus
  concept: string
  steps: { id: string; title: string; done: boolean }[]
  refs: string[] // ids de itens do acervo
  notes: string
  updatedAt: number
}

/* ---------- Estado ---------- */
export interface AppState {
  version: 1
  updatedAt: number // última alteração local (ms), usada na sincronização
  settings: Settings
  tasks: Task[]
  sessions: Session[]
  timer: { startedAt: number | null; taskId: string | null }
  habits: Habit[]
  habitLog: Record<string, string[]>
  dayNotes: Record<string, DayNote>
  gafero: { projects: Project[]; library: LibItem[] }
  health: Record<string, HealthDay>
  art: { items: ArtItem[]; ideas: Idea[]; projects: ArtProject[] }
}
