import { z } from 'zod'
import { dataset } from './dataset'
import { createEvidenceEngine } from './evidence'
import { subsystemIdSchema } from './types'

export const toolNames = [
  'list_subsystems',
  'list_contributors',
  'search_pull_requests',
  'find_contributors',
  'get_contributor_evidence',
  'get_pull_request',
] as const
export type ToolName = (typeof toolNames)[number]
export const toolSchemas = {
  list_subsystems: z.strictObject({}),
  list_contributors: z.strictObject({}),
  search_pull_requests: z.strictObject({
    query: z.string().trim().min(2).max(80),
    subsystemId: subsystemIdSchema.optional(),
  }),
  find_contributors: z.strictObject({ subsystemId: subsystemIdSchema }),
  get_contributor_evidence: z.strictObject({
    contributorId: z.string().min(1).max(50),
    subsystemId: subsystemIdSchema.optional(),
  }),
  get_pull_request: z.strictObject({ pullRequestId: z.string().regex(/^PR-\d+$/) }),
}
export const toolDescriptions: Record<ToolName, string> = {
  list_subsystems:
    'List the four subsystems covered by the fixed fictional Northstar dataset. Missing coverage is not evidence of missing ability.',
  list_contributors:
    'List the eighteen fictional contributors, their roles, and their descriptive profiles. Profiles are context, not proof of expertise.',
  search_pull_requests:
    'Search titles, summaries, review excerpts, paths, and illustrative diffs with normalized keywords. Returns up to eight recent matches and a total count; inspect a PR for full evidence.',
  find_contributors:
    'Find contribution evidence for one supported subsystem. Ordered by recent authored PRs, recent reviews, latest contribution, then stable ID. Not an expertise or ownership score.',
  get_contributor_evidence:
    'Inspect authored and reviewed fictional PRs for one contributor, optionally limited to a subsystem.',
  get_pull_request:
    'Read one fictional pull request, including summary, review excerpts, and illustrative diff.',
}
export function executeTool(name: ToolName, input: unknown): Record<string, unknown> {
  const engine = createEvidenceEngine(dataset)
  switch (name) {
    case 'list_subsystems':
      toolSchemas[name].parse(input)
      return { subsystems: engine.listSubsystems(), asOf: dataset.asOf, fictional: true }
    case 'list_contributors':
      toolSchemas[name].parse(input)
      return { contributors: engine.listContributors(), fictional: true }
    case 'search_pull_requests': {
      const args = toolSchemas[name].parse(input)
      return engine.searchPullRequests(args.query, args.subsystemId)
    }
    case 'find_contributors':
      return { findings: engine.findContributors(toolSchemas[name].parse(input).subsystemId) }
    case 'get_contributor_evidence': {
      const args = toolSchemas[name].parse(input)
      return { evidence: engine.getContributorEvidence(args.contributorId, args.subsystemId) }
    }
    case 'get_pull_request':
      return { pullRequest: engine.getPullRequest(toolSchemas[name].parse(input).pullRequestId) }
    default:
      throw new Error('Unknown tool')
  }
}
