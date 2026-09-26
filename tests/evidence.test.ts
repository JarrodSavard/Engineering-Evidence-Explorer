import { describe, expect, it } from 'vitest'
import { dataset } from '../domain/dataset'
import { createEvidenceEngine, isRecent } from '../domain/evidence'

describe('evidence rules', () => {
  it('includes day 180 and excludes older and future observations', () => {
    expect(isRecent('2026-01-01', '2026-06-30')).toBe(true)
    expect(isRecent('2025-12-31', '2026-06-30')).toBe(false)
    expect(isRecent('2026-07-01', '2026-06-30')).toBe(false)
  })
  it('ranks recent authentication authors ahead of review-only and older evidence', () => {
    const result = createEvidenceEngine(dataset).findContributors('authentication')
    expect(result.map((x) => x.contributor.id)).toEqual([
      'maya',
      'theo',
      'sofia',
      'imani',
      'eli',
      'nora',
      'leah',
    ])
    expect(result[0]).toMatchObject({
      recentAuthored: 4,
      recentReviewed: 3,
      classification: 'recent-authorship',
    })
    expect(result.find((x) => x.contributor.id === 'eli')).toMatchObject({
      recentAuthored: 0,
      classification: 'review-only',
    })
    expect(result.find((x) => x.contributor.id === 'leah')).toMatchObject({
      recentAuthored: 0,
      recentReviewed: 0,
      classification: 'older-evidence',
    })
  })
  it('keeps billing and job expertise separate', () => {
    const engine = createEvidenceEngine(dataset)
    expect(engine.findContributors('billing')[0]?.contributor.id).toBe('jonas')
    expect(engine.findContributors('background-jobs')[0]?.contributor.id).toBe('priya')
  })
  it('normalizes search and combines contributor and role filters', () => {
    const engine = createEvidenceEngine(dataset)
    const result = engine.search({
      query: '  TOKEN   rotation ',
      contributorId: 'maya',
      role: 'author',
    })
    expect(result.map((x) => x.id)).toEqual(['PR-101'])
    expect(engine.search({ query: 'disaster recovery' })).toEqual([])
    expect(
      engine.search({ subsystemId: 'authentication', contributorId: 'eli', role: 'reviewer' })
        .length,
    ).toBeGreaterThan(0)
  })
  it('rejects unknown IDs instead of returning unrelated evidence', () => {
    const engine = createEvidenceEngine(dataset)
    expect(() => engine.findContributors('unknown')).toThrow(/Unknown subsystem/)
    expect(() => engine.getPullRequest('../secrets')).toThrow(/Unknown pull request/)
    expect(() => engine.getContributorEvidence('unknown')).toThrow(/Unknown contributor/)
  })
  it('returns no-match evidence without manufacturing a recommendation', () => {
    const empty = { ...dataset, pullRequests: [] }
    expect(createEvidenceEngine(empty).findContributors('authentication')).toEqual([])
    expect(createEvidenceEngine(dataset).getContributorEvidence('mateo', 'authentication')).toEqual(
      [],
    )
  })
  it('uses latest evidence then stable IDs to resolve count ties', () => {
    const first = dataset.pullRequests[0]!
    const fixture = {
      ...dataset,
      pullRequests: [
        { ...first, id: 'a', authorId: 'maya', reviews: [], mergedAt: '2026-05-01' },
        { ...first, id: 'b', authorId: 'eli', reviews: [], mergedAt: '2026-06-01' },
        { ...first, id: 'c', authorId: 'leah', reviews: [], mergedAt: '2026-05-01' },
      ],
    }
    expect(
      createEvidenceEngine(fixture)
        .findContributors('authentication')
        .map((x) => x.contributor.id),
    ).toEqual(['eli', 'leah', 'maya'])
  })
})
