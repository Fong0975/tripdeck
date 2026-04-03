import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string
}

const RECORDS_DIR = path.resolve(process.cwd(), 'records')

function recordsApiPlugin(): Plugin {
  return {
    name: 'records-api',
    configureServer(server) {
      void mkdir(RECORDS_DIR, { recursive: true })

      server.middlewares.use('/api/records', async (req, res, next) => {
        const url = req.url ?? '/'
        const method = req.method ?? 'GET'

        const respond = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }

        const readBody = (): Promise<unknown> =>
          new Promise((resolve, reject) => {
            let raw = ''
            req.on('data', (chunk: Buffer) => {
              raw += chunk.toString()
            })
            req.on('end', () => {
              try {
                resolve(JSON.parse(raw))
              } catch {
                reject(new Error('Invalid JSON body'))
              }
            })
          })

        try {
          if (url === '/trips') {
            if (method === 'GET') {
              try {
                const data = await readFile(
                  path.join(RECORDS_DIR, 'trips.json'),
                  'utf-8',
                )
                respond(200, JSON.parse(data))
              } catch {
                respond(200, [])
              }
              return
            }
            if (method === 'PUT') {
              const data = await readBody()
              await writeFile(
                path.join(RECORDS_DIR, 'trips.json'),
                JSON.stringify(data, null, 2),
                'utf-8',
              )
              respond(200, { ok: true })
              return
            }
          }

          const tripMatch = url.match(/^\/trip\/([^/?]+)/)
          if (tripMatch) {
            const id = tripMatch[1]
            const filePath = path.join(RECORDS_DIR, `trip_${id}.json`)

            if (method === 'GET') {
              try {
                const data = await readFile(filePath, 'utf-8')
                respond(200, JSON.parse(data))
              } catch {
                respond(404, { error: 'Not found' })
              }
              return
            }
            if (method === 'PUT') {
              const data = await readBody()
              await writeFile(
                filePath,
                JSON.stringify(data, null, 2),
                'utf-8',
              )
              respond(200, { ok: true })
              return
            }
            if (method === 'DELETE') {
              try {
                await unlink(filePath)
              } catch {
                // file may not exist
              }
              respond(200, { ok: true })
              return
            }
          }

          if (url === '/checklist-template') {
            if (method === 'GET') {
              let raw: string | null = null
              try {
                raw = await readFile(
                  path.join(RECORDS_DIR, 'checklist_template.json'),
                  'utf-8',
                )
              } catch {
                try {
                  raw = await readFile(
                    path.resolve(process.cwd(), 'public/records/checklist_template.json'),
                    'utf-8',
                  )
                } catch {
                  // no default available
                }
              }
              respond(200, raw ? JSON.parse(raw) : { categories: [] })
              return
            }
            if (method === 'PUT') {
              const data = await readBody()
              await writeFile(
                path.join(RECORDS_DIR, 'checklist_template.json'),
                JSON.stringify(data, null, 2),
                'utf-8',
              )
              respond(200, { ok: true })
              return
            }
          }

          const checklistMatch = url.match(/^\/checklist\/([^/?]+)/)
          if (checklistMatch) {
            const tripId = checklistMatch[1]
            const filePath = path.join(RECORDS_DIR, `checklist_${tripId}.json`)

            if (method === 'GET') {
              try {
                const data = await readFile(filePath, 'utf-8')
                respond(200, JSON.parse(data))
              } catch {
                respond(404, { error: 'Not found' })
              }
              return
            }
            if (method === 'PUT') {
              const data = await readBody()
              await writeFile(
                filePath,
                JSON.stringify(data, null, 2),
                'utf-8',
              )
              respond(200, { ok: true })
              return
            }
            if (method === 'DELETE') {
              try {
                await unlink(filePath)
              } catch {
                // file may not exist
              }
              respond(200, { ok: true })
              return
            }
          }

          next()
        } catch (err) {
          respond(500, { error: String(err) })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), recordsApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
