import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('.output/public')
const base = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/$/, '')
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
    if (base && pathname !== base && !pathname.startsWith(`${base}/`)) {
      res.writeHead(404).end()
      return
    }
    let path = resolve(root, `.${pathname.slice(base.length) || '/'}`)
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403).end()
      return
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
    const body = await readFile(path)
    res
      .writeHead(200, {
        'Content-Type': mime[extname(path)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
  }
}).listen(Number(process.env.PORT || 4187), '127.0.0.1', () =>
  console.log(`Static preview: http://127.0.0.1:${process.env.PORT || 4187}${base}/`),
)
