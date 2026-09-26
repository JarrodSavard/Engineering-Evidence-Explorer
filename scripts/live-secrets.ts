import { spawn } from 'node:child_process'

process.loadEnvFile('.env')
const secrets = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ALLOWED_ORIGIN: process.env.LIVE_ALLOWED_ORIGIN,
}
for (const [name, value] of Object.entries(secrets)) {
  if (!value)
    throw new Error(`Set ${name === 'ALLOWED_ORIGIN' ? 'LIVE_ALLOWED_ORIGIN' : name} in .env`)
  const child = spawn(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'secret',
      'put',
      name,
      '--config',
      'worker/wrangler.jsonc',
    ],
    { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true },
  )
  child.stdin.end(value)
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })
  if (code !== 0) throw new Error(`Unable to install ${name} as a Worker secret`)
  console.log(`${name} installed as a Worker secret.`)
}
