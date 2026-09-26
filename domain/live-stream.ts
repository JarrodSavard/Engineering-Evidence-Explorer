import { liveStreamEventSchema, type LiveResult, type LiveStreamEvent } from './live-contract'

export async function* readLiveStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<LiveStreamEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const tools: LiveResult['tools'] = []
  let pending = ''
  let terminal = false
  try {
    while (true) {
      const next = await reader.read()
      pending += decoder.decode(next.done ? undefined : next.value, { stream: !next.done })
      if (pending.length > 1_000_000) throw new Error('Live event exceeds the size limit')
      let end: number
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end).trim()
        pending = pending.slice(end + 1)
        if (!line) continue
        if (terminal) throw new Error('Live stream contains events after completion')
        const event = liveStreamEventSchema.parse(JSON.parse(line))
        if (event.type === 'tool') {
          tools.push(event.tool)
          if (tools.length > 20) throw new Error('Live stream exceeded the tool limit')
        } else if (event.type === 'complete') {
          if (JSON.stringify(event.result.tools) !== JSON.stringify(tools))
            throw new Error('Live stream tool calls do not match the verified answer')
          terminal = true
        } else {
          terminal = true
        }
        yield event
      }
      if (next.done) break
    }
    if (pending.trim()) throw new Error('Live stream ended with an incomplete event')
    if (!terminal) throw new Error('Live stream ended before the answer completed')
  } finally {
    reader.releaseLock()
  }
}
