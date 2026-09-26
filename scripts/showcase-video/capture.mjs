import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const out = 'output/showcase-video/assets'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
})
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
async function shot(name, locator) {
  await page.evaluate(() => document.fonts.ready)
  if (locator) await locator.screenshot({ path: `${out}/${name}.png` })
  else await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`Captured ${name}`)
}
try {
  await page.goto('http://localhost:4187/', { waitUntil: 'networkidle' })
  await page
    .getByLabel('Your question')
    .fill('Who reviewed queue lease work and what did they say?')
  await shot('ask')
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/investigate') && r.request().method() === 'POST',
    { timeout: 90000 },
  )
  await page.getByRole('button', { name: 'Investigate question', exact: true }).click()
  const response = await responsePromise
  if (!response.ok()) throw new Error(`Live showcase capture failed: HTTP ${response.status()}`)
  await page.getByText('Live model answer', { exact: true }).waitFor({ timeout: 90000 })
  await writeFile(
    'output/showcase-video/live-visible-transcript.txt',
    await page.locator('.live-session').innerText(),
  )
  await page.locator('.live-trace').scrollIntoViewIfNeeded()
  await shot('tools', page.locator('.live-trace'))
  await shot('answer', page.locator('.replay-event'))
  await page.getByRole('button', { name: 'Inspect PR-116 from live answer' }).click()
  await shot('evidence', page.locator('.evidence-panel'))
  await page.goto('http://localhost:4187/team', { waitUntil: 'networkidle' })
  await shot('team')
  await page.goto('http://localhost:4187/investigations/billing-jobs', { waitUntil: 'networkidle' })
  await shot('billing')
  await page.goto('http://localhost:4187/investigations/disaster-recovery', {
    waitUntil: 'networkidle',
  })
  await shot('uncertainty')
  await shot('uncertainty-detail', page.locator('.insufficient'))
  await page.goto('http://localhost:4187/investigations/authentication', {
    waitUntil: 'networkidle',
  })
  await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await shot('replay')
  await page.goto('http://localhost:4187/architecture', { waitUntil: 'networkidle' })
  await shot('architecture')
  await writeFile(
    'output/showcase-video/capture-report.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        source: 'Actual local application UI; one genuine live request',
        errors,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
