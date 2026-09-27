import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 同时兼容 VITE_ 与 NEXT_PUBLIC_ 前缀的环境变量
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { host: true },
})
