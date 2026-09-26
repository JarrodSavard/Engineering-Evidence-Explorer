import { describe, expect, it } from 'vitest'
import { datasetHash, validateReplay } from '../domain/replay'
import { executeTool } from '../domain/tools'

async function fixture() {
  return {
    version: 1,
    scenarioId: 'authentication',
    datasetHash: await datasetHash(),
    recordedAt: '2026-09-25T12:00:00.000Z',
    host: 'Test fixture — not a genuine recording',
    model: 'test',
    reviewed: true,
    events: [
      { type: 'user', text: 'Who worked on authentication?' },
      {
        type: 'tool',
        name: 'get_pull_request',
        arguments: { pullRequestId: 'PR-101' },
        result: executeTool('get_pull_request', { pullRequestId: 'PR-101' }),
        durationMs: 5,
      },
      { type: 'assistant', text: 'Maya authored PR-101.', evidenceIds: ['PR-101'] },
    ],
  }
}
describe('recording validation', () => {
  it('checks every PR inside a cited range, not only its endpoints', async () => {
    const f = await fixture()
    f.events.splice(2, 0, {
      type: 'tool',
      name: 'get_pull_request',
      arguments: { pullRequestId: 'PR-103' },
      result: executeTool('get_pull_request', { pullRequestId: 'PR-103' }),
      durationMs: 5,
    } as any)
    Object.assign(f.events.at(-1)!, {
      text: 'Maya authored PR-101–PR-103.',
      evidenceIds: ['PR-101', 'PR-103'],
    })
    await expect(validateReplay(f)).rejects.toThrow(/citation|evidence/i)
  })
  it('accepts matching tool results and resolvable evidence', async () => {
    expect((await validateReplay(await fixture())).scenarioId).toBe('authentication')
  })
  it('rejects stale datasets', async () => {
    await expect(
      validateReplay({ ...(await fixture()), datasetHash: '0'.repeat(64) }),
    ).rejects.toThrow(/dataset/i)
  })
  it('rejects altered tool results', async () => {
    const f = await fixture()
    ;(f.events[1] as any).result = { pullRequest: { id: 'PR-101', authorId: 'nora' } }
    await expect(validateReplay(f)).rejects.toThrow(/result/i)
  })
  it('rejects an incorrect recency label on a cited record', async () => {
    const f = await fixture()
    ;(f.events[2] as any).text = 'Maya authored PR-101, an older change.'
    await expect(validateReplay(f)).rejects.toThrow(/recency/i)
  })
  it('rejects missing, unknown, or unobserved citations', async () => {
    for (const evidenceIds of [['PR-999'], ['PR-102'], []]) {
      const f = await fixture()
      ;(f.events[2] as any).evidenceIds = evidenceIds
      await expect(validateReplay(f)).rejects.toThrow(/evidence|citation/i)
    }
  })
  it('rejects unreviewed and incomplete sessions', async () => {
    await expect(validateReplay({ ...(await fixture()), reviewed: false })).rejects.toThrow(
      /review/i,
    )
    const f = await fixture()
    f.events.pop()
    await expect(validateReplay(f)).rejects.toThrow(/assistant/i)
  })
  it('rejects invalid durations and unknown scenarios', async () => {
    const f = await fixture()
    ;(f.events[1] as any).durationMs = -1
    await expect(validateReplay(f)).rejects.toThrow()
    await expect(validateReplay({ ...(await fixture()), scenarioId: 'secret' })).rejects.toThrow()
  })
})
