import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { datasetHash } from '../../domain/replay'

test('explores evidence, filters it, and restores focus from the evidence panel', async ({
  page,
}) => {
  await page.goto('/investigations/authentication')
  await expect(
    page.getByRole('heading', { name: 'Who should review an authentication change?' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /Inspect PR-101/ })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: 'Make refresh-token rotation atomic' }),
  ).toBeFocused()
  await expect(page.getByText('auth/refresh.ts', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close evidence' }).click()
  await expect(page.getByRole('button', { name: /Inspect PR-101/ }).first()).toBeFocused()
  await page.getByLabel('Contributor').selectOption('eli')
  await page.getByLabel('Contribution').selectOption('author')
  await expect(page.getByText('No pull requests match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('button', { name: /Inspect PR-101/ }).first()).toBeVisible()
})
test('keeps complementary findings separate and never invents recovery expertise', async ({
  page,
}) => {
  await page.goto('/investigations/billing-jobs')
  await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Background jobs', exact: true })).toBeVisible()
  await page.getByRole('link', { name: /Disaster recovery/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Insufficient evidence', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Missing evidence is not missing ability.', { exact: true }),
  ).toBeVisible()
})

test('replays genuine events and links the final answer to evidence', async ({ page }) => {
  await page.goto('/investigations/authentication')
  await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
  await expect(page.getByText('Step 1 of 14', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Step 2 of 14', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show final answer' }).click()
  await expect(
    page.getByText(/strongest recent authentication implementation candidates/),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Inspect PR-101 from recording' }).click()
  await expect(
    page.getByRole('heading', { name: 'Make refresh-token rotation atomic' }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Close evidence' }).click()
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(page.getByText('Step 1 of 14', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play recording' }).click()
  await page.getByRole('button', { name: 'Explore the evidence', exact: true }).click()
  await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
  await expect(page.getByText('Step 1 of 14', { exact: true })).toBeVisible()
})

test('reduced motion keeps playback manual', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/investigations/disaster-recovery')
  await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
  await expect(page.getByText(/Reduced motion: manual stepping enabled/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play recording' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Step 2 of 3', { exact: true })).toBeVisible()
})

test('the standalone MCP workspace sends a visitor question and exposes its tool trace', async ({
  page,
}) => {
  const requests: unknown[] = []
  await page.route('**/investigate', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scenarioId: 'open-question',
        question: 'Who worked on token rotation?',
        model: 'gpt-6-luna',
        datasetHash: await datasetHash(),
        generatedAt: new Date().toISOString(),
        answer: 'Maya authored PR-101; inspect that work before deciding.',
        evidenceIds: ['PR-101'],
        tools: [
          {
            name: 'get_pull_request',
            arguments: { pullRequestId: 'PR-101' },
            result: {},
            durationMs: 3,
          },
        ],
      }),
    })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Ask the evidence.' })).toBeVisible()
  const run = page.getByRole('button', { name: 'Investigate question' })
  if (await run.count()) {
    await page.getByLabel('Your question').fill('Who worked on token rotation?')
    await run.click()
    await expect(
      page.getByText('Maya authored PR-101; inspect that work before deciding.'),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Observed MCP calls' })).toBeVisible()
    await page.getByRole('button', { name: 'Inspect PR-101 from live answer' }).click()
    await expect(
      page.getByRole('heading', { name: 'Make refresh-token rotation atomic' }),
    ).toBeFocused()
    await page.getByRole('button', { name: 'Close evidence' }).click()
    await expect(
      page.getByRole('button', { name: 'Inspect PR-101 from live answer' }),
    ).toBeFocused()
    expect(requests).toEqual([
      { scenarioId: 'open-question', question: 'Who worked on token rotation?' },
    ])
  } else {
    await expect(page.getByText(/Live questions are not connected/)).toBeVisible()
    expect(requests).toEqual([])
  }
})

test('live MCP calls appear as an observable timeline with their inputs and results', async ({
  page,
}) => {
  const tool = {
    name: 'get_pull_request',
    arguments: { pullRequestId: 'PR-101' },
    result: { pullRequest: { id: 'PR-101' } },
    durationMs: 3,
  }
  await page.route('**/investigate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body:
        [
          { type: 'tool', tool },
          {
            type: 'complete',
            result: {
              scenarioId: 'open-question',
              question: 'Who worked on token rotation?',
              model: 'gpt-6-luna',
              datasetHash: await datasetHash(),
              generatedAt: new Date().toISOString(),
              answer: 'Maya authored PR-101.',
              evidenceIds: ['PR-101'],
              tools: [tool],
            },
          },
        ]
          .map((event) => JSON.stringify(event))
          .join('\n') + '\n',
    })
  })
  await page.goto('/')
  const run = page.getByRole('button', { name: 'Investigate question' })
  if (!(await run.count())) return
  await page.getByLabel('Your question').fill('Who worked on token rotation?')
  await run.click()
  await expect(page.getByRole('heading', { name: 'Observed MCP calls' })).toBeVisible()
  await expect
    .poll(() =>
      page.locator('#live-trace-title').evaluate((element) => {
        const top = element.getBoundingClientRect().top
        return top >= 16 && top < window.innerHeight / 2
      }),
    )
    .toBe(true)
  await expect(page.getByText(/"pullRequestId": "PR-101"/)).toBeVisible()
  await expect(page.getByText(/"id": "PR-101"/)).toBeVisible()
  await expect(page.getByText('Maya authored PR-101.')).toBeVisible()
  await expect(page.getByText(/Private model reasoning is not available/)).toBeVisible()
})

test('MCP questions live on the homepage and the model name stays out of the interface', async ({
  page,
}) => {
  for (const path of ['/', '/investigations/authentication', '/architecture']) {
    await page.goto(path)
    await expect(page.getByText(/GPT-6 Luna/i)).toHaveCount(0)
  }
  await page.goto('/investigations/authentication')
  await expect(page.getByRole('button', { name: /Run with/ })).toHaveCount(0)
  await page.getByRole('link', { name: /Ask the evidence/ }).click()
  await expect(page.getByRole('heading', { name: 'Ask the evidence.' })).toBeVisible()
})

test('the MCP homepage is accessible and fits its viewport', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('the expanded team can be filtered and its work inspected', async ({ page }) => {
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Meet the Northstar team.' })).toBeVisible()
  await expect(page.getByText('18 of 18 people')).toBeVisible()
  await page.getByLabel('Search people').fill('Yusuf')
  await expect(page.getByText('1 of 18 people')).toBeVisible()
  await page.getByText(/Inspect \d+ contributions/).click()
  await page.getByRole('button', { name: /PR-161/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Link request and job spans with safe context' }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Close evidence' }).click()
  await page.getByLabel('Search people').fill('no matching person')
  await expect(page.getByText('No fictional engineers match those filters.')).toBeVisible()
})

for (const status of [200, 404]) {
  test(`an unavailable recording (${status}) never substitutes a generated answer`, async ({
    page,
  }) => {
    await page.route('**/recordings/authentication.json', (route) =>
      route.fulfill({ status, contentType: 'application/json', body: '{"events":[]}' }),
    )
    await page.goto('/investigations/authentication')
    await page.getByRole('button', { name: 'Watch recorded investigation' }).click()
    await expect(page.getByRole('heading', { name: 'Recording unavailable' })).toBeVisible()
    await page.getByRole('button', { name: 'Explore the evidence', exact: true }).click()
    await expect(page.getByRole('button', { name: /Inspect PR-101/ }).first()).toBeVisible()
  })
}

test('keyboard access reaches evidence and Escape restores the trigger', async ({ page }) => {
  await page.goto('/investigations/authentication')
  const trigger = page.getByRole('button', { name: /Inspect PR-101/ }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Make refresh-token rotation atomic' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('reopening the same pull request focuses the evidence heading again', async ({ page }) => {
  await page.goto('/investigations/authentication')
  const trigger = page.getByRole('button', { name: /Inspect PR-101/ }).first()
  await trigger.click()
  await trigger.click()
  await expect(
    page.getByRole('heading', { name: 'Make refresh-token rotation atomic' }),
  ).toBeFocused()
})

test('contribution counts expose their meaning to assistive technology', async ({ page }) => {
  await page.goto('/investigations/authentication')
  const firstFinding = await page.locator('.finding-row').first().ariaSnapshot()
  expect(firstFinding).toContain('4 recent authored pull requests')
  expect(firstFinding).toContain('3 recent reviewed pull requests')
})
test('has accessible landmarks and no horizontal overflow', async ({ page }) => {
  await page.goto('/investigations/authentication')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
test('static experience never contacts external services', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (req) => {
    if (new URL(req.url()).origin !== new URL(baseURL!).origin) external.push(req.url())
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'How it works' }).click()
  await expect(
    page.getByRole('heading', { name: 'Small by design. Open to inspection.' }),
  ).toBeVisible()
  expect(external).toEqual([])
})
