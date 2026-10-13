import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  // A Vercel avisa o código injetando a variável VERCEL=1
  const isVercel = process.env.VERCEL === '1';
  
  return {
    plugins: [react()],
    // Se for Vercel usa '/', se for o seu PC/Desktop usa './'
    base: isVercel ? '/' : './',
  }
})