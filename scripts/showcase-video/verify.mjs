import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
const manifest = JSON.parse(await readFile('output/showcase-video/manifest.json', 'utf8'))
const base = 'http://127.0.0.1:4196'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base)
  await page.waitForFunction(() => document.querySelector('video').readyState >= 1)
  const metadata = await page.locator('video').evaluate((v) => ({
    duration: v.duration,
    width: v.videoWidth,
    height: v.videoHeight,
    error: v.error?.message ?? null,
  }))
  if (
    metadata.duration !== manifest.duration ||
    metadata.width !== 1920 ||
    metadata.height !== 1080 ||
    metadata.error
  )
    throw new Error(JSON.stringify(metadata))
  await page.locator('video').evaluate(async (v) => {
    v.muted = true
    await v.play()
  })
  await page.waitForFunction(() => document.querySelector('video').currentTime > 2)
  await page.locator('video').evaluate((v) => v.pause())
  await page.getByRole('button', { name: /Evidence$/ }).click()
  await page.waitForFunction(() => !document.querySelector('video').seeking)
  await page.screenshot({ path: 'output/showcase-video/browser-review.png', fullPage: true })
  const chapterTime = await page.locator('video').evaluate((v) => v.currentTime)
  if (Math.abs(chapterTime - manifest.scenes.find((s) => s.id === 'evidence').start) > 0.1)
    throw new Error('Chapter navigation failed')
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  )
  if (mobileOverflow || errors.length) throw new Error(JSON.stringify({ mobileOverflow, errors }))
  const downloads = []
  for (const name of [
    'engineering-evidence-explorer-1080p.mp4',
    'engineering-evidence-explorer-4k.mp4',
    'captions.srt',
    'transcript.txt',
  ]) {
    const response = await fetch(`${base}/${name}`, { method: 'HEAD' })
    if (!response.ok) throw new Error(`Missing download: ${name}`)
    downloads.push({ name, bytes: Number(response.headers.get('content-length')) })
  }
  const range = await fetch(`${base}/engineering-evidence-explorer-1080p.mp4`, {
    headers: { Range: 'bytes=0-99' },
  })
  if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 100)
    throw new Error('Media range support failed')
  const report = {
    metadata,
    playbackAdvanced: true,
    chapterTime,
    mobileOverflow,
    downloads,
    rangeRequests: true,
    errors,
  }
  await writeFile(
    'output/showcase-video/browser-verification.json',
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report))
} finally {
  await browser.close()
}
