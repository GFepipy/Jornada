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

## Publicação

Publicado em https://gfepipy.github.io/Jornada/. Cada push na branch `main` gera e publica o site (`.github/workflows/deploy.yml`). No repositório, **Settings → Pages → Source** precisa estar em **GitHub Actions**.

## Sincronização entre aparelhos

Os dados ficam em um arquivo `jornada.json` dentro de um repositório **privado** do GitHub (ex.: `GFepipy/jornada-dados`).

1. Crie o repositório privado.
2. Crie um token *fine-grained* com acesso só a esse repositório e permissão **Contents: Read and write**.
3. Em cada aparelho, abra **Configurações → Sincronização**, informe o repositório e cole o token.

O token fica só no navegador de cada aparelho. Em caso de conflito, vale a versão alterada por último. Em **Configurações → Backup manual** também dá para baixar e importar um arquivo `.json`.

## Estrutura

- `src/store.ts` — estado do app, persistência e regras (cronômetro, tarefas, hábitos)
- `src/pages/` — uma página por aba (`Home`, `Gafero`, `Health`, `Art`)
- `src/pages/home/` — cartões da aba Início (cronômetro, tarefas, cronograma, calendário, hábitos)
- `src/components/` — componentes compartilhados, dock e configurações
- `src/styles/` — tema (bege / cinza escuro) e estilos
