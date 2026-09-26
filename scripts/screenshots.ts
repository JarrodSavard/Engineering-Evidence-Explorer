import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4187'
await mkdir('output/screenshots', { recursive: true })
const browser = await chromium.launch()
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
] as const) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => {
    console.error(error)
    process.exitCode = 1
  })
  await page.goto(`${base}/investigations/authentication`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `output/screenshots/${name}.png`, fullPage: true })
  await page
    .getByRole('button', { name: /Inspect PR-101/ })
    .first()
    .click()
  await page.screenshot({ path: `output/screenshots/${name}-evidence.png`, fullPage: true })
  await page.close()
}
await browser.close()
