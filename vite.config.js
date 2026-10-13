import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // LÓGICA INTELIGENTE:
  // Se detetar que está no servidor da Vercel, usa '/' (Padrão Web)
  // Se detetar que está no seu computador a criar o .exe, usa './' (Padrão Desktop)
  base: process.env.VERCEL ? '/' : './',
})