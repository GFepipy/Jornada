# Jornada

App pessoal de produtividade com quatro abas: **Início**, **Gafero**, **Saúde** e **Arte**.
Feito com Vite + React + TypeScript. Os dados ficam salvos no próprio navegador (localStorage), sem conta e sem servidor.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. O servidor também fica acessível na rede local, então dá para abrir no celular (mesmo Wi‑Fi) pelo endereço "Network" que o Vite mostra no terminal.

## Publicar (para usar de qualquer lugar e instalar no celular)

```bash
npm run build
```

Gera a pasta `dist/`, que é um site estático: pode ser publicada em Vercel, Netlify, Cloudflare Pages ou GitHub Pages. Publicado em HTTPS, o app pode ser instalado na tela inicial do celular e funciona offline.

## Dados e backup

Cada navegador/aparelho guarda os próprios dados. Em **Configurações → Seus dados** dá para baixar um backup (`.json`) e importá-lo em outro aparelho.

## Estrutura

- `src/store.ts` — estado do app, persistência e regras (cronômetro, tarefas, hábitos)
- `src/pages/` — uma página por aba (`Home`, `Gafero`, `Health`, `Art`)
- `src/pages/home/` — cartões da aba Início (cronômetro, tarefas, cronograma, calendário, hábitos)
- `src/components/` — componentes compartilhados, dock e configurações
- `src/styles/` — tema (bege / cinza escuro) e estilos
