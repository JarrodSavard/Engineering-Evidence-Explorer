import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

process.loadEnvFile('.env')
const key = process.env.OPENAI_API_KEY
const origin = process.env.LIVE_ALLOWED_ORIGIN
if (!key || !origin) throw new Error('Set OPENAI_API_KEY and LIVE_ALLOWED_ORIGIN in .env')
await writeFile(
  'worker/.dev.vars',
  `OPENAI_API_KEY=${JSON.stringify(key)}\nALLOWED_ORIGIN=${JSON.stringify(origin)}\n`,
)
const child = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--config',
    'worker/wrangler.jsonc',
    '--local',
    '--port',
    '8787',
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
  },
)
child.on('error', (error) => {
  console.error('Unable to start the local Worker:', error.message)
  process.exitCode = 1
})
child.on('close', (code) => {
  process.exitCode = code || 0
})
