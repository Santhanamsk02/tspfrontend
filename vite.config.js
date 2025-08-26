import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ml: ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd', 'face-api.js', '@mediapipe/tasks-vision'],
          ui: ['framer-motion', 'react-icons', 'styled-components', 'react-toastify'],
          forms: ['formik', 'yup'],
          charts: ['recharts'],
          utils: ['axios', 'xlsx']
        }
      }
    },
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'esnext',
    minify: 'esbuild'
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'formik',
      'yup'
    ]
  }
})
