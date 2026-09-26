import { z } from 'zod'
import { toolNames } from './tools'

export const liveModel = 'gpt-6-luna'
const liveScenarioIdSchema = z.enum([
  'authentication',
  'billing-jobs',
  'disaster-recovery',
  'open-question',
])
export const liveRequestSchema = z
  .strictObject({
    scenarioId: liveScenarioIdSchema,
    question: z.string().trim().min(8).max(400).optional(),
  })
  .refine((request) => request.scenarioId !== 'open-question' || Boolean(request.question), {
    path: ['question'],
    message: 'Ask a question to start an investigation',
  })
export const liveToolEventSchema = z.object({
  name: z.enum(toolNames),
  arguments: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  durationMs: z.number().nonnegative(),
})
export const liveResultSchema = z.object({
  scenarioId: liveScenarioIdSchema,
  question: liveRequestSchema.shape.question,
  model: z.literal(liveModel),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
  generatedAt: z.iso.datetime(),
  answer: z.string().min(1).max(6000),
  evidenceIds: z.array(z.string()),
  tools: z.array(liveToolEventSchema).min(1).max(20),
})
export type LiveResult = z.infer<typeof liveResultSchema>
export const liveStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tool'), tool: liveToolEventSchema }),
  z.object({ type: z.literal('complete'), result: liveResultSchema }),
  z.object({ type: z.literal('error'), error: z.string().min(1).max(500) }),
])
export type LiveStreamEvent = z.infer<typeof liveStreamEventSchema>
