import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { liveResultSchema } from '../domain/live-contract'
import { citedEvidenceIds, validateReplay } from '../domain/replay'
import { scenarios } from '../domain/scenarios'

const id = process.argv[2]
const scenario = scenarios.find((item) => item.id === id)
if (!scenario) throw new Error('Unknown scenario')
if (!process.argv.includes('--reviewed'))
  throw new Error('Review the actual answer against all cited evidence before importing')
const raw = z
  .object({
    scenarioId: z.string(),
    prompt: z.string(),
    responses: z.array(z.object({ model: z.string(), output: z.array(z.unknown()) })),
    result: liveResultSchema,
  })
  .parse(JSON.parse(await readFile(`.recordings/${id}.api.json`, 'utf8')))
if (raw.scenarioId !== id || raw.prompt !== scenario.question || raw.result.scenarioId !== id)
  throw new Error('Recording scenario mismatch')
if (!raw.responses.length || raw.responses.some((response) => response.model !== 'gpt-6-luna'))
  throw new Error('Host did not report GPT-6 Luna for every turn')
const visibleMessages = raw.responses.flatMap((response) =>
  response.output.flatMap((item) => {
    const message = z
      .object({
        type: z.literal('message'),
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
      })
      .safeParse(item)
    return message.success
      ? message.data.content
          .filter((part) => part.type === 'output_text')
          .map((part) => part.text || '')
      : []
  }),
)
if (visibleMessages.length !== 1 || visibleMessages[0]?.trim() !== raw.result.answer)
  throw new Error('Visible host conversation differs from the final answer')
const hostCalls = raw.responses.flatMap((response) =>
  response.output.filter(
    (item) => z.object({ type: z.literal('function_call') }).safeParse(item).success,
  ),
)
if (hostCalls.length !== raw.result.tools.length)
  throw new Error('Captured MCP call count differs from host output')
for (const [index, item] of hostCalls.entries()) {
  const call = z.object({ name: z.string(), arguments: z.string() }).parse(item)
  const tool = raw.result.tools[index]!
  if (
    call.name !== tool.name ||
    JSON.stringify(JSON.parse(call.arguments)) !== JSON.stringify(tool.arguments)
  )
    throw new Error(`Captured tool call ${index + 1} differs from host output`)
}
const recording = await validateReplay({
  version: 1,
  scenarioId: id,
  datasetHash: raw.result.datasetHash,
  recordedAt: raw.result.generatedAt,
  host: 'OpenAI Responses API · local MCP client',
  model: 'gpt-6-luna (confirmed by every API response)',
  reviewed: true,
  events: [
    { type: 'user', text: raw.prompt, evidenceIds: [] },
    ...raw.result.tools.map((tool) => ({ type: 'tool', ...tool })),
    {
      type: 'assistant',
      text: raw.result.answer,
      evidenceIds: citedEvidenceIds(raw.result.answer),
    },
  ],
})
await mkdir('public/recordings', { recursive: true })
await writeFile(`public/recordings/${id}.json`, JSON.stringify(recording, null, 2) + '\n')
console.log(`${id}: published ${recording.events.length} verified GPT-6 Luna events.`)
