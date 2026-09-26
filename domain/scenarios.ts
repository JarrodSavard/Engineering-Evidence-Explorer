import type { Scenario } from './types'
export const scenarios: Scenario[] = [
  {
    id: 'authentication',
    name: 'Authentication reviewer',
    title: 'Who should review an authentication change?',
    question:
      'Who has recent authentication implementation experience? Inspect their contributions and supporting PRs before recommending a reviewer.',
    description:
      'You are changing the refresh-token flow. Find someone with recent hands-on context, then check the work behind the recommendation.',
    lesson: 'Recent implementation is a useful signal. It is not the same as ownership.',
    subsystemIds: ['authentication'],
  },
  {
    id: 'billing-jobs',
    name: 'Billing & background jobs',
    title: 'One change. Two kinds of context.',
    question:
      'Who should review a change spanning billing and background jobs? Compare the evidence separately for each subsystem and inspect relevant PRs.',
    description:
      'A payment event now triggers background work. Find the people whose contributions cover each side of the boundary.',
    lesson: 'A cross-system change can call for complementary reviewers, not a single winner.',
    subsystemIds: ['billing', 'background-jobs'],
  },
  {
    id: 'disaster-recovery',
    name: 'Disaster recovery',
    title: 'What if the evidence is not there?',
    question:
      'Who should lead disaster recovery? First check which subsystems this dataset covers. If it cannot answer, state the gap without guessing or treating observability work as recovery expertise.',
    description:
      'You need a reviewer for a recovery plan. The records cover four subsystems, but recovery procedures are not one of them.',
    lesson:
      'An honest boundary is part of a useful answer. Missing evidence is not missing ability.',
    subsystemIds: [],
    query: 'disaster recovery',
  },
]
