import { describe, expect, it } from 'vitest'
import { readLiveStream } from '../domain/live-stream'

const tool = {
  name: 'get_pull_request',
  arguments: { pullRequestId: 'PR-101' },
  result: { pullRequest: { id: 'PR-101' } },
  durationMs: 4,
}
const result = {
  scenarioId: 'open-question',
  question: 'Who worked on token rotation?',
  model: 'gpt-6-luna',
  datasetHash: 'a'.repeat(64),
  generatedAt: '2026-09-25T12:00:00.000Z',
  answer: 'Maya — PR-101.',
  evidenceIds: ['PR-101'],
  tools: [tool],
}
function chunks(parts: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(part))
      controller.close()
    },
  })
}
async function collect(stream: ReadableStream<Uint8Array>) {
  const events = []
  for await (const event of readLiveStream(stream)) events.push(event)
  return events
}

describe('live event stream', () => {
  it('reads tool and completion events split across byte and line boundaries', async () => {
    const bytes = new TextEncoder().encode(
      `${JSON.stringify({ type: 'tool', tool })}\n${JSON.stringify({ type: 'complete', result })}\n`,
    )
    const split = bytes.indexOf(0xe2) + 1
    const events = await collect(
      chunks([bytes.slice(0, 7), bytes.slice(7, split), bytes.slice(split)]),
    )
    expect(events.map((event) => event.type)).toEqual(['tool', 'complete'])
    expect(events[1]).toEqual({ type: 'complete', result })
  })

  it('rejects a missing or inconsistent final answer', async () => {
    const encoder = new TextEncoder()
    await expect(
      collect(chunks([encoder.encode(`${JSON.stringify({ type: 'tool', tool })}\n`)])),
    ).rejects.toThrow('completed')
    const changed = { ...result, tools: [{ ...tool, durationMs: 5 }] }
    await expect(
      collect(
        chunks([
          encoder.encode(
            `${JSON.stringify({ type: 'tool', tool })}\n${JSON.stringify({ type: 'complete', result: changed })}\n`,
          ),
        ]),
      ),
    ).rejects.toThrow('match')
  })
})
