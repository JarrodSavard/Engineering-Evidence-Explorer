import type { Dataset, EvidenceFilters, Finding } from './types'

export function isRecent(date: string, asOf: string): boolean {
  const age = (Date.parse(asOf) - Date.parse(date)) / 86_400_000
  return Number.isFinite(age) && age >= 0 && age <= 180
}
export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
export function createEvidenceEngine(data: Dataset) {
  function requireSubsystem(id?: string) {
    if (id && !data.subsystems.some((s) => s.id === id)) throw new Error(`Unknown subsystem: ${id}`)
  }
  function requireContributor(id?: string) {
    if (id && !data.contributors.some((c) => c.id === id))
      throw new Error(`Unknown contributor: ${id}`)
  }
  function search(filters: EvidenceFilters = {}) {
    requireSubsystem(filters.subsystemId)
    requireContributor(filters.contributorId)
    const words = normalize(filters.query || '')
      .split(' ')
      .filter(Boolean)
    return data.pullRequests
      .filter((pr) => {
        if (filters.subsystemId && !pr.subsystemIds.includes(filters.subsystemId as never))
          return false
        if (filters.contributorId) {
          const authored = pr.authorId === filters.contributorId
          const reviewed = pr.reviews.some((r) => r.contributorId === filters.contributorId)
          if (
            filters.role === 'author'
              ? !authored
              : filters.role === 'reviewer'
                ? !reviewed
                : !authored && !reviewed
          )
            return false
        }
        // Search contribution content, not cautionary caveats in summaries or inferred expertise.
        const haystack = normalize(`${pr.title} ${pr.file} ${pr.diff}`)
        return words.every((word) => haystack.includes(word))
      })
      .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt) || a.id.localeCompare(b.id))
  }
  function getContributorEvidence(contributorId: string, subsystemId?: string) {
    requireContributor(contributorId)
    return search({ contributorId, subsystemId }).map((pr) => ({
      ...pr,
      role: pr.authorId === contributorId ? ('author' as const) : ('reviewer' as const),
      recent: isRecent(pr.mergedAt, data.asOf),
    }))
  }
  function findContributors(subsystemId: string): Finding[] {
    requireSubsystem(subsystemId)
    return data.contributors
      .flatMap((contributor) => {
        const prs = getContributorEvidence(contributor.id, subsystemId)
        if (!prs.length) return []
        const recentAuthored = prs.filter((p) => p.recent && p.role === 'author').length
        const recentReviewed = prs.filter((p) => p.recent && p.role === 'reviewer').length
        const classification = recentAuthored
          ? 'recent-authorship'
          : recentReviewed
            ? 'review-only'
            : 'older-evidence'
        return [
          {
            contributor,
            recentAuthored,
            recentReviewed,
            latestContribution: prs[0]!.mergedAt,
            classification,
            pullRequestIds: prs.map((p) => p.id),
            limitation:
              'Contribution evidence is not proof of ownership, availability, or overall ability.',
          } satisfies Finding,
        ]
      })
      .sort(
        (a, b) =>
          b.recentAuthored - a.recentAuthored ||
          b.recentReviewed - a.recentReviewed ||
          b.latestContribution.localeCompare(a.latestContribution) ||
          a.contributor.id.localeCompare(b.contributor.id),
      )
  }
  function getPullRequest(id: string) {
    const pr = data.pullRequests.find((p) => p.id === id)
    if (!pr) throw new Error(`Unknown pull request: ${id}`)
    return pr
  }
  function searchPullRequests(query: string, subsystemId?: string) {
    requireSubsystem(subsystemId)
    const words = normalize(query).split(' ').filter(Boolean)
    if (!words.length) return { total: 0, pullRequests: [] }
    const matches = data.pullRequests
      .filter((pr) => {
        if (subsystemId && !pr.subsystemIds.includes(subsystemId as never)) return false
        const content = normalize(
          `${pr.title} ${pr.summary} ${pr.file} ${pr.diff} ${pr.reviews.map((review) => review.excerpt).join(' ')}`,
        )
        return words.every((word) => content.includes(word))
      })
      .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt) || a.id.localeCompare(b.id))
    return {
      total: matches.length,
      pullRequests: matches
        .slice(0, 8)
        .map(({ id, title, authorId, mergedAt, subsystemIds, summary }) => ({
          id,
          title,
          authorId,
          mergedAt,
          subsystemIds,
          summary,
        })),
    }
  }
  return {
    search,
    findContributors,
    getContributorEvidence,
    getPullRequest,
    searchPullRequests,
    listContributors: () => data.contributors,
    listSubsystems: () => data.subsystems,
  }
}
