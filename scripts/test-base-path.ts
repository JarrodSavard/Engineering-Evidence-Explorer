import { spawn } from 'node:child_process'
import { chromium, expect } from '@playwright/test'

const base = process.env.NUXT_APP_BASE_URL || '/'
const origin = 'http://127.0.0.1:4190'
const server = spawn(process.execPath, ['--import', 'tsx', 'scripts/preview.ts'], {
  env: { ...process.env, PORT: '4190' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const closed = new Promise<void>((resolve) => server.on('close', () => resolve()))
await new Promise<void>((resolve, reject) => {
  server.stdout.once('data', () => resolve())
  server.once('error', reject)
  server.once('exit', (code) => reject(new Error(`Preview exited before readiness: ${code}`)))
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== origin || !url.pathname.startsWith(base))
      errors.push(`Unexpected request: ${url.href}`)
  })
  const notices = await page.request.get(`${origin}${base}third-party-notices.txt`)
  expect(notices.status()).toBe(200)
  expect(await notices.text()).toContain('SIL OPEN FONT LICENSE')
  await page.goto(`${origin}${base}`)
  await expect(page.getByRole('heading', { name: 'Ask the evidence.' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Investigations/ })).toBeVisible()
  for (const id of ['authentication', 'billing-jobs', 'disaster-recovery']) {
    await page.goto(`${origin}${base}investigations/${id}`)
    await expect(page.locator('h1')).toBeVisible()
    await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
    await expect(page.getByRole('button', { name: 'Show final answer' })).toBeVisible()
    await page.getByRole('button', { name: 'Show final answer' }).click()
    await expect(page.locator('.message-text')).toBeVisible()
  }
  await page.goto(`${origin}${base}team`)
  await expect(page.getByRole('heading', { name: 'Meet the Northstar team.' })).toBeVisible()
  await expect(page.getByText('18 of 18 people')).toBeVisible()
  await page.getByRole('link', { name: 'How it works' }).click()
  await expect(page).toHaveURL(`${origin}${base}architecture`)
  expect(errors).toEqual([])
  console.log(`Verified static routes, team directory, assets, and all three replays under ${base}`)
} finally {
  await browser?.close()
  server.kill()
  await closed
}
