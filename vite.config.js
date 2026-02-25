import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false  // use next free port if 5173 is in use
  }
})

