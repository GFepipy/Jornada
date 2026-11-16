import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// publicado em https://gfepipy.github.io/Jornada/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Jornada/' : '/',
  plugins: [react()],
  server: { port: 5173, host: true },
}))
