import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { scenarios } from '../domain/scenarios'

const scenario = scenarios.find((s) => s.id === process.argv[2])
if (!scenario) throw new Error(`Choose one scenario: ${scenarios.map((s) => s.id).join(', ')}`)
const model = 'gpt-6-luna'
await mkdir('.recordings', { recursive: true })
const root = process.cwd().replaceAll('\\', '/')
const prompt = `This is a recorded portfolio investigation of a fictional engineering team. Your only task is to answer the question below using the evidence MCP tools. Do not inspect files, use shell commands, browse, load skills, change code, or call other tools. First call list_subsystems. Then call the evidence tools needed to inspect the relevant sources. Cite PR IDs for every concrete contribution claim. Be concise (under 220 words). Distinguish recent authorship, reviews, older evidence, and insufficient evidence. The data is fixed at 2026-06-30. Do not infer ownership, availability, or overall ability. Do not include private reasoning.\n\nQuestion: ${scenario.question}`
await writeFile(`.recordings/${scenario.id}.prompt.txt`, prompt)
const args = [
  'exec',
  '--ignore-user-config',
  '--ephemeral',
  '--skip-git-repo-check',
  '--sandbox',
  'read-only',
  '--json',
  '--model',
  model,
  '-c',
  `mcp_servers.evidence.command=${JSON.stringify(process.execPath.replaceAll('\\', '/'))}`,
  '-c',
  `mcp_servers.evidence.args=${JSON.stringify(['--import', 'tsx', `${root}/mcp/server.ts`])}`,
  '-c',
  `mcp_servers.evidence.cwd=${JSON.stringify(root)}`,
  '-c',
  'mcp_servers.evidence.startup_timeout_sec=30',
  '-o',
  resolve(`.recordings/${scenario.id}.answer.txt`),
  prompt,
]
const child = spawn(process.env.CODEX_BIN || 'codex', args, {
  cwd: process.cwd(),
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let stdout = '',
  stderr = ''
let pending = ''
const toolStarts = new Map<string, number>()
const durations: Record<string, number> = {}
const recordedAt = new Date().toISOString()
child.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  stdout += text
  pending += text
  const lines = pending.split('\n')
  pending = lines.pop() || ''
  for (const line of lines) {
    try {
      const event = JSON.parse(line)
      if (event.item?.type !== 'mcp_tool_call') continue
      if (event.type === 'item.started') toolStarts.set(event.item.id, performance.now())
      if (event.type === 'item.completed') {
        const start = toolStarts.get(event.item.id)
        if (start !== undefined)
          durations[event.item.id] = Math.max(0, Math.round(performance.now() - start))
      }
    } catch {
      /* Non-JSON output remains in the raw export for diagnosis. */
    }
  }
})
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
})
const code = await new Promise<number | null>((ok, fail) => {
  child.on('error', fail)
  child.on('close', ok)
})
await writeFile(`.recordings/${scenario.id}.jsonl`, stdout)
await writeFile(`.recordings/${scenario.id}.stderr.log`, stderr)
await writeFile(
  `.recordings/${scenario.id}.metadata.json`,
  JSON.stringify(
    {
      recordedAt,
      requestedModel: model,
      durations,
      timing: 'Elapsed between host tool-start and tool-complete events, including transport.',
    },
    null,
    2,
  ),
)
console.log(
  `Recording process exited ${code}. Raw host output saved locally for review; nothing published.`,
)
process.exitCode = code ?? 1
