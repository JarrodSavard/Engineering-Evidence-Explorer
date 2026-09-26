import { z } from 'zod'
import { dataset } from './dataset'
import { isRecent } from './evidence'
import { scenarios } from './scenarios'
import { executeTool, toolNames } from './tools'

const textEvent = z.object({
  type: z.enum(['user', 'assistant']),
  text: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
})
const toolEvent = z.object({
  type: z.literal('tool'),
  name: z.enum(toolNames),
  arguments: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  durationMs: z.number().finite().nonnegative(),
})
export const replaySchema = z.object({
  version: z.literal(1),
  scenarioId: z.string().refine((id) => scenarios.some((s) => s.id === id), 'Unknown scenario'),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
  recordedAt: z.iso.datetime(),
  host: z.string().min(1),
  model: z.string().min(1),
  reviewed: z.literal(true, { error: 'Recording must be reviewed before publication' }),
  events: z
    .array(z.union([textEvent, toolEvent]))
    .min(3, 'Recording requires a user prompt, tool evidence, and an assistant answer'),
})
export type ReplaySession = z.infer<typeof replaySchema>
export type ReplayEvent = ReplaySession['events'][number]
export function citedEvidenceIds(text: string): string[] {
  const ids = new Set<string>()
  for (const match of text.matchAll(/PR-(\d+)(?:\s*[–—-]\s*(?:PR-)?(\d+))?/g)) {
    const first = Number(match[1]),
      last = Number(match[2] ?? match[1])
    if (
      !Number.isSafeInteger(first) ||
      !Number.isSafeInteger(last) ||
      last < first ||
      last - first > 1000
    )
      throw new Error('Invalid evidence citation range')
    for (let number = first; number <= last; number++) ids.add(`PR-${number}`)
  }
  return [...ids]
}
export function checkRecencyDescriptions(answer: string, evidenceIds: string[]) {
  for (const id of evidenceIds) {
    const pr = dataset.pullRequests.find((item) => item.id === id)
    if (!pr) continue
    const older = new RegExp(
      `(?:\\b(?:older|historical|not recent)\\b[^.\\n]{0,45}\\b${id}\\b|\\b${id}\\b[^.\\n]{0,45}\\b(?:older|historical|not recent)\\b)`,
      'i',
    )
    const recent = new RegExp(
      `(?:\\brecent\\b[^.\\n]{0,45}\\b${id}\\b|\\b${id}\\b[^.\\n]{0,45}\\brecent\\b)`,
      'i',
    )
    if (
      (isRecent(pr.mergedAt, dataset.asOf) && older.test(answer)) ||
      (!isRecent(pr.mergedAt, dataset.asOf) && recent.test(answer))
    )
      throw new Error(`Model answer has an unsupported recency description for ${id}`)
  }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
export async function datasetHash(): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(dataset)))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function validateReplay(input: unknown): Promise<ReplaySession> {
  const session = replaySchema.parse(input)
  if (session.datasetHash !== (await datasetHash()))
    throw new Error('Recording dataset hash does not match the bundled dataset')
  if (session.events[0]?.type !== 'user') throw new Error('Recording must begin with a user prompt')
  if (session.events.at(-1)?.type !== 'assistant')
    throw new Error('Recording must end with an assistant answer')
  const observed = new Set<string>()
  let toolCount = 0
  for (const event of session.events) {
    if (event.type === 'tool') {
      toolCount++
      if (canonical(event.result) !== canonical(executeTool(event.name, event.arguments)))
        throw new Error(`Recorded result differs from current tool output: ${event.name}`)
      for (const id of JSON.stringify(event.result).match(/PR-\d+/g) || []) observed.add(id)
    } else if (event.type === 'assistant') {
      const mentioned = new Set(citedEvidenceIds(event.text))
      checkRecencyDescriptions(event.text, [...mentioned])
      for (const id of mentioned)
        if (!event.evidenceIds.includes(id)) throw new Error(`Missing citation for ${id}`)
      for (const id of event.evidenceIds) {
        if (!dataset.pullRequests.some((pr) => pr.id === id) || !observed.has(id))
          throw new Error(`Unresolved or unobserved evidence: ${id}`)
      }
    }
  }
  if (!toolCount) throw new Error('Recording requires actual tool evidence')
  return session
}
