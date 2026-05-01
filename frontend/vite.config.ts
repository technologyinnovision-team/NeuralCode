import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detect if we're building for Electron
const isElectronBuild =
  process.argv.includes('--electron') ||
  process.env.VITE_ELECTRON_BUILD === 'true' ||
  process.env.VITE_ELECTRON_BUILD === '1'

export default defineConfig({
  base: isElectronBuild ? './' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Externalize Node modules in Electron preload
      external: isElectronBuild ? ['electron'] : [],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5000,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
  },
})
