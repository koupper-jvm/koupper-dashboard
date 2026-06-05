import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:18083',
      '/voice': 'http://localhost:18083',
      '/events': {
        target: 'http://localhost:18083',
        changeOrigin: true,
      },
    },
  },
})
