import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root = resolve('output/showcase-video')
const allowed = new Set([
  'review.html',
  'engineering-evidence-explorer-1080p.mp4',
  'engineering-evidence-explorer-4k.mp4',
  'poster.jpg',
  'captions.srt',
  'captions.vtt',
  'transcript.txt',
  'credits.txt',
  'assets/serif.woff2',
  'assets/sans.woff2',
])
const types = {
  '.html': 'text/html; charset=utf-8',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
}
createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'review.html'
    if (!allowed.has(name) || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404)
      res.end()
      return
    }
    const file = resolve(root, name),
      { size } = await stat(file)
    const headers = {
      'Content-Type': types[extname(file)],
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    }
    let start = 0,
      end = size - 1,
      status = 200
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range)
      if (
        !match ||
        (start = Number(match[1])) >= size ||
        (end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) < start
      ) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` })
        res.end()
        return
      }
      status = 206
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`
    }
    headers['Content-Length'] = end - start + 1
    res.writeHead(status, headers)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(file, { start, end })
    stream.pipe(res)
    res.on('close', () => stream.destroy())
    stream.on('error', () => res.destroy())
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(4196, '127.0.0.1', () => console.log('Showcase review: http://127.0.0.1:4196'))
