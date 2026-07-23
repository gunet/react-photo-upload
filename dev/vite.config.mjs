import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const devRoot = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(devRoot, '..')
const MOCK_VALIDATION_DELAY_MS = 3000

function mockPhotoApi() {
  return {
    name: 'mock-photo-api',
    configureServer(server) {
      server.middlewares.use('/api/validate-photo', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }

        const validationTimer = setTimeout(() => {
          response.setHeader('Content-Type', 'application/json')
          response.end(
            JSON.stringify({
              report: { accept: true },
              message: 'Mock validation passed.',
            }),
          )
        }, MOCK_VALIDATION_DELAY_MS)

        response.on('close', () => clearTimeout(validationTimer))
      })

      server.middlewares.use('/api/save-photo', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }

        response.setHeader('Content-Type', 'application/json')
        response.end(
          JSON.stringify({
            id: 'mock-photo-id',
            message: 'Mock photo saved successfully.',
          }),
        )
      })
    },
  }
}

export default defineConfig({
  root: devRoot,
  plugins: [react(), mockPhotoApi()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 4001,
    fs: {
      allow: [packageRoot],
    },
  },
})
