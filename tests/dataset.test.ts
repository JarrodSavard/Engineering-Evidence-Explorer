import { it, expect } from 'vitest'
import { dataset } from '../domain/dataset'
import { contributorSchema, pullRequestSchema } from '../domain/types'
it('ships a coherent fictional snapshot without dangling evidence references', () => {
  expect(dataset.contributors).toHaveLength(18)
  expect(dataset.pullRequests).toHaveLength(72)
  expect(dataset.subsystems).toHaveLength(4)
  const people = new Set(dataset.contributors.map((c) => contributorSchema.parse(c).id))
  expect(dataset.contributors.every((person) => person.bio.length >= 65)).toBe(true)
  const ids = new Set<string>()
  for (const input of dataset.pullRequests) {
    const pr = pullRequestSchema.parse(input)
    expect(ids.has(pr.id)).toBe(false)
    ids.add(pr.id)
    expect(people.has(pr.authorId)).toBe(true)
    expect(pr.mergedAt <= dataset.asOf).toBe(true)
    expect(pr.summary.length >= 80).toBe(true)
    for (const review of pr.reviews) expect(people.has(review.contributorId)).toBe(true)
  }
})
