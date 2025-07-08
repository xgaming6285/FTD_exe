import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    open: false,
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      'localhost',
      '127.0.0.1'
    ],
  },
  preview: {
    host: true,
    port: 3000,
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://ftd-backend.onrender.com/api')
  }
})