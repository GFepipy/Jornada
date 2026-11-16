import type { Area, ArtKind, ArtProjectStatus, ArtStatus, LibKind, ProjectStatus, PTaskStatus, WorkoutType } from '../types'

export const AREAS: Record<Area, { label: string; color: string }> = {
  pessoal: { label: 'Pessoal', color: 'var(--c-pessoal)' },
  gafero: { label: 'Gafero', color: 'var(--c-gafero)' },
  saude: { label: 'Saúde', color: 'var(--c-saude)' },
  arte: { label: 'Arte', color: 'var(--c-arte)' },
}
export const AREA_ORDER: Area[] = ['pessoal', 'gafero', 'saude', 'arte']

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180]

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'var(--c-saude)' },
  pausado: { label: 'Pausado', color: 'var(--c-pessoal)' },
  concluido: { label: 'Concluído', color: 'var(--c-arte)' },
}
export const PTASK_COLS: { id: PTaskStatus; label: string }[] = [
  { id: 'todo', label: 'A fazer' },
  { id: 'doing', label: 'Fazendo' },
  { id: 'done', label: 'Feito' },
]
export const LIB_KINDS: Record<LibKind, { label: string; plural: string }> = {
  prompt: { label: 'Prompt', plural: 'Prompts' },
  script: { label: 'Script de venda', plural: 'Scripts' },
  processo: { label: 'Processo', plural: 'Processos' },
  link: { label: 'Link', plural: 'Links' },
}

export const WORKOUT_TYPES: Record<WorkoutType, { label: string; color: string }> = {
  forca: { label: 'Força', color: 'var(--c-gafero)' },
  cardio: { label: 'Cardio', color: 'var(--c-arte)' },
  calistenia: { label: 'Calistenia', color: 'var(--c-saude)' },
}

export const ART_KINDS: Record<ArtKind, { label: string; plural: string }> = {
  filme: { label: 'Filme', plural: 'Filmes' },
  serie: { label: 'Série', plural: 'Séries' },
  livro: { label: 'Livro', plural: 'Livros' },
  musica: { label: 'Música', plural: 'Música' },
  jogo: { label: 'Jogo', plural: 'Jogos' },
  exposicao: { label: 'Exposição', plural: 'Exposições' },
  outro: { label: 'Outro', plural: 'Outros' },
}
export const ART_STATUS: Record<ArtStatus, string> = {
  quero: 'Na fila',
  andamento: 'Em andamento',
  concluido: 'Concluído',
}
export const ART_PROJECT_STATUS: Record<ArtProjectStatus, string> = {
  ideia: 'Ideia',
  desenvolvimento: 'Em desenvolvimento',
  finalizado: 'Finalizado',
}
