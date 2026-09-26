import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { citedEvidenceIds, datasetHash, validateReplay } from '../domain/replay'
import { scenarios } from '../domain/scenarios'

const id = process.argv[2]
if (!scenarios.some((s) => s.id === id)) throw new Error('Unknown scenario')
if (!process.argv.includes('--reviewed'))
  throw new Error('Review the actual answer against the evidence before importing with --reviewed')
const raw = (await readFile(`.recordings/${id}.jsonl`, 'utf8'))
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
const metadata = JSON.parse(await readFile(`.recordings/${id}.metadata.json`, 'utf8'))
if (
  !raw.some((e) => e.type === 'turn.completed') ||
  raw.some((e) => e.type === 'turn.failed' || e.type === 'error')
)
  throw new Error('Host session did not complete successfully')
const events: unknown[] = [
  { type: 'user', text: await readFile(`.recordings/${id}.prompt.txt`, 'utf8'), evidenceIds: [] },
]
for (const event of raw) {
  if (event.type !== 'item.completed') continue
  const item = event.item
  if (item.type === 'agent_message')
    events.push({
      type: 'assistant',
      text: item.text,
      evidenceIds: citedEvidenceIds(item.text),
    })
  else if (item.type === 'mcp_tool_call') {
    if (
      item.server !== 'evidence' ||
      item.status !== 'completed' ||
      item.error ||
      !item.result?.structured_content
    )
      throw new Error('Unexpected or unsuccessful MCP call')
    const durationMs = metadata.durations[item.id]
    if (typeof durationMs !== 'number')
      throw new Error(`Missing actual duration for ${item.id}; rerun with the current recorder`)
    events.push({
      type: 'tool',
      name: item.tool,
      arguments: item.arguments,
      result: item.result.structured_content,
      durationMs,
    })
  } else if (item.type !== 'reasoning')
    throw new Error(`Unexpected host item ${item.type}; inspect before publication`)
}
const recording = await validateReplay({
  version: 1,
  scenarioId: id,
  datasetHash: await datasetHash(),
  recordedAt: metadata.recordedAt,
  host: 'Codex CLI · authenticated ChatGPT session',
  model:
    metadata.requestedModel === 'gpt-6-luna'
      ? 'GPT-6 Luna requested; host export did not independently report the model'
      : 'Host default; model identifier not included in export',
  reviewed: true,
  events,
})
await mkdir('public/recordings', { recursive: true })
await writeFile(`public/recordings/${id}.json`, JSON.stringify(recording, null, 2) + '\n')
console.log(
  `Published reviewed local artifact: ${id} (${recording.events.length} genuine events). No hidden reasoning or host identifiers included.`,
)
