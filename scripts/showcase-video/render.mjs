import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const out = resolve('output/showcase-video')
const spec = JSON.parse(await readFile(`${out}/manifest.json`, 'utf8'))
const storyboard = process.argv.includes('--storyboard')
await mkdir(`${out}/storyboard`, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: storyboard ? 1 : 2,
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(pathToFileURL(`${out}/film.html`).href)
  await page.evaluate(() => window.filmReady)
  const checks = []
  for (const scene of spec.scenes) {
    const time = scene.start + (scene.end - scene.start) * 0.55
    await page.evaluate((t) => window.setFilmTime(t), time)
    await page.screenshot({ path: `${out}/storyboard/${scene.id}.png` })
    checks.push(
      await page.evaluate((id) => {
        const cap = document.querySelector('#caption span'),
          r = cap.getBoundingClientRect()
        const el = document.querySelector(`[data-id="${id}"]`)
        return {
          id,
          imagesLoaded: [...el.querySelectorAll('img')].every((i) => i.naturalWidth > 0),
          overflow: [...el.querySelectorAll('h1,p')]
            .filter((e) => e.scrollWidth > e.clientWidth + 2)
            .map((e) => e.textContent),
          caption: cap.textContent,
          captionSafe: r.left >= 90 && r.right <= 1830 && r.bottom < 1020,
          fonts: document.fonts.status,
        }
      }, scene.id),
    )
  }
  await writeFile(`${out}/storyboard/checks.json`, JSON.stringify({ checks, errors }, null, 2))
  if (
    errors.length ||
    checks.some(
      (c) => !c.imagesLoaded || c.overflow.length || !c.captionSafe || c.fonts !== 'loaded',
    )
  )
    throw new Error('Storyboard validation failed')
  console.log('Storyboard validated: 8 scenes, loaded fonts/images, safe caption bounds')
  if (!storyboard) {
    const encoder = spawn(
      `${out}/tools/ffmpeg.exe`,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'warning',
        '-f',
        'image2pipe',
        '-c:v',
        'mjpeg',
        '-framerate',
        '30',
        '-i',
        'pipe:0',
        '-an',
        '-vf',
        'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '18',
        '-threads',
        '4',
        '-pix_fmt',
        'yuv420p',
        '-color_range',
        'tv',
        '-colorspace',
        'bt709',
        '-color_primaries',
        'bt709',
        '-color_trc',
        'bt709',
        '-movflags',
        '+faststart',
        `${out}/picture-4k.mp4`,
      ],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] },
    )
    let log = ''
    encoder.stderr.on('data', (b) => (log += b))
    const done = once(encoder, 'close')
    encoder.stdin.on('error', () => {})
    const frames = spec.duration * spec.fps
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.setFilmTime(t), f / spec.fps)
      const frame = await page.screenshot({ type: 'jpeg', quality: 95 })
      if (!encoder.stdin.write(frame)) await once(encoder.stdin, 'drain')
      if (f % 150 === 0) console.log(JSON.stringify({ frame: f, total: frames }))
    }
    encoder.stdin.end()
    const [code] = await done
    if (code) throw new Error(log)
    await writeFile(
      `${out}/render-report.json`,
      JSON.stringify({ frames, ...spec, renderedAt: new Date().toISOString() }, null, 2),
    )
    console.log('Native 4K picture complete')
  }
} finally {
  await browser.close()
}
