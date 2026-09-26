import { mkdir, writeFile } from 'node:fs/promises'
import { runLiveInvestigation } from '../domain/live'
import { scenarios } from '../domain/scenarios'

process.loadEnvFile('.env')
const scenario = scenarios.find((item) => item.id === process.argv[2])
if (!scenario) throw new Error(`Choose a scenario: ${scenarios.map((item) => item.id).join(', ')}`)
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error('Set OPENAI_API_KEY in the ignored .env file')
const responses: unknown[] = []
const capture: typeof fetch = async (input, init) => {
  const response = await fetch(input, init)
  const body: unknown = await response.clone().json()
  if (!response.ok) {
    const parsed = body && typeof body === 'object' && 'error' in body ? body.error : null
    const error = parsed && typeof parsed === 'object' ? parsed : {}
    console.error(
      `OpenAI response: HTTP ${response.status}; type=${String('type' in error ? error.type : 'unknown')}; code=${String('code' in error ? error.code : 'unknown')}`,
    )
  }
  responses.push(body)
  return response
}
const result = await runLiveInvestigation(scenario.id, key, capture)
await mkdir('.recordings', { recursive: true })
await writeFile(
  `.recordings/${scenario.id}.api.json`,
  JSON.stringify(
    { scenarioId: scenario.id, prompt: scenario.question, responses, result },
    null,
    2,
  ),
)
console.log(
  `${scenario.id}: captured ${result.tools.length} actual MCP calls with ${result.model}. Raw response saved locally.`,
)
