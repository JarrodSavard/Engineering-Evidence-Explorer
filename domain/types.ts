import { z } from 'zod'

export const subsystemIds = [
  'authentication',
  'billing',
  'background-jobs',
  'observability',
] as const
export const subsystemIdSchema = z.enum(subsystemIds)
export type SubsystemId = z.infer<typeof subsystemIdSchema>
export const contributorSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  initials: z.string(),
  color: z.string(),
  bio: z.string().min(65),
})
export const pullRequestSchema = z.object({
  id: z.string().regex(/^PR-\d+$/),
  title: z.string(),
  summary: z.string(),
  authorId: z.string(),
  mergedAt: z.iso.date(),
  subsystemIds: z.array(subsystemIdSchema).min(1),
  reviews: z.array(z.object({ contributorId: z.string(), excerpt: z.string() })),
  file: z.string(),
  diff: z.string(),
})
export type Contributor = z.infer<typeof contributorSchema>
export type PullRequest = z.infer<typeof pullRequestSchema>
export interface Subsystem {
  id: SubsystemId
  name: string
  description: string
}
export interface Dataset {
  organization: string
  asOf: string
  contributors: Contributor[]
  subsystems: Subsystem[]
  pullRequests: PullRequest[]
}
export type EvidenceClass = 'recent-authorship' | 'review-only' | 'older-evidence'
export interface Finding {
  contributor: Contributor
  recentAuthored: number
  recentReviewed: number
  latestContribution: string
  classification: EvidenceClass
  pullRequestIds: string[]
  limitation: string
}
export interface EvidenceFilters {
  subsystemId?: string
  contributorId?: string
  role?: 'any' | 'author' | 'reviewer'
  query?: string
}
export interface Scenario {
  id: string
  name: string
  title: string
  question: string
  description: string
  lesson: string
  subsystemIds: SubsystemId[]
  query?: string
}
