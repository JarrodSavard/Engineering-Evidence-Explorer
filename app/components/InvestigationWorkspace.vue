<script setup lang="ts">
import { dataset } from '../../domain/dataset'
import { createEvidenceEngine } from '../../domain/evidence'
import { scenarios } from '../../domain/scenarios'
import type { PullRequest, EvidenceClass } from '../../domain/types'
const props = defineProps<{ scenarioId: string }>()
const scenario = computed(() => scenarios.find((s) => s.id === props.scenarioId)!)
const engine = createEvidenceEngine(dataset)
const view = ref<'explore' | 'replay'>('explore')
const subsystem = ref(''),
  contributor = ref(''),
  role = ref<'any' | 'author' | 'reviewer'>('any'),
  query = ref('')
const selected = ref<PullRequest | null>(null)
const evidencePanel = ref<{ focusHeading: () => void }>()
watch(contributor, (id) => {
  if (!id) role.value = 'any'
})
let returnFocus: HTMLElement | null = null
const labels: Record<EvidenceClass, string> = {
  'recent-authorship': 'Recent authorship',
  'review-only': 'Recent reviews only',
  'older-evidence': 'Older evidence',
}
const groups = computed(() =>
  scenario.value.subsystemIds.map((id) => ({
    subsystem: dataset.subsystems.find((s) => s.id === id)!,
    findings: engine.findContributors(id),
  })),
)
const prs = computed(() =>
  engine
    .search({
      subsystemId: subsystem.value || undefined,
      contributorId: contributor.value || undefined,
      role: role.value,
      query: query.value || scenario.value.query,
    })
    .filter(
      (pr) =>
        !scenario.value.subsystemIds.length ||
        pr.subsystemIds.some((id) => scenario.value.subsystemIds.includes(id)),
    ),
)
const clear = () => {
  subsystem.value = ''
  contributor.value = ''
  role.value = 'any'
  query.value = ''
}
async function inspect(id: string, event: Event) {
  returnFocus = event.currentTarget as HTMLElement
  selected.value = engine.getPullRequest(id)
  await nextTick()
  evidencePanel.value?.focusHeading()
}
function filterContributor(contributorId: string, subsystemId: string) {
  contributor.value = contributorId
  subsystem.value = subsystemId
  role.value = 'any'
  query.value = ''
}
async function close() {
  selected.value = null
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
}
const person = (id: string) => dataset.contributors.find((c) => c.id === id)!
const formattedDate = (date: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
useHead({ title: computed(() => `${scenario.value.name} — Evidence Explorer`) })
</script>
<template>
  <div class="workspace">
    <aside class="sidebar">
      <div class="workspace-name">
        <span class="org-symbol">N</span>
        <div><strong>Northstar</strong><span>Fictional engineering team</span></div>
      </div>
      <nav class="scenario-nav" aria-label="Investigations">
        <h2>Investigations</h2>
        <NuxtLink
          v-for="item in scenarios"
          :key="item.id"
          :to="`/investigations/${item.id}`"
          :class="{ active: item.id === scenarioId }"
          :aria-current="item.id === scenarioId ? 'page' : undefined"
          ><AppIcon :name="item.id === 'disaster-recovery' ? 'search' : 'branch'" /><span
            >{{ item.name
            }}<small>{{
              item.id === 'authentication'
                ? 'Find a reviewer'
                : item.id === 'billing-jobs'
                  ? 'Connect the context'
                  : 'Recognize a gap'
            }}</small></span
          ><AppIcon name="chevron" :size="13"
        /></NuxtLink>
      </nav>
      <section class="dataset-summary">
        <h2>The sample dataset</h2>
        <p>
          {{ dataset.contributors.length }} engineers · {{ dataset.pullRequests.length }} pull
          requests
        </p>
        <ul>
          <li v-for="item in dataset.subsystems" :key="item.id">
            <span class="subsystem-dot" />{{ item.name }}
          </li>
        </ul>
        <div class="snapshot-note">
          <AppIcon name="file" :size="15" /><span
            >Snapshot<br /><strong>June 30, 2026</strong></span
          >
        </div>
      </section>
      <p class="sidebar-footnote">
        <NuxtLink to="/team">Meet all {{ dataset.contributors.length }} engineers →</NuxtLink
        ><br />A fully inspectable fictional team.
      </p>
    </aside>
    <main id="main" class="investigation-main">
      <div class="page-context">
        <span>Engineering knowledge / Investigation</span
        ><span class="badge fictional">Fictional dataset</span>
      </div>
      <header class="investigation-header">
        <h1>{{ scenario.title }}</h1>
        <p>{{ scenario.description }}</p>
      </header>
      <div class="view-switch" role="group" aria-label="Investigation view">
        <button
          :class="{ selected: view === 'explore' }"
          :aria-pressed="view === 'explore'"
          @click="view = 'explore'"
        >
          <AppIcon name="search" :size="16" />Explore the evidence</button
        ><button
          :class="{ selected: view === 'replay' }"
          :aria-pressed="view === 'replay'"
          @click="view = 'replay'"
        >
          <AppIcon name="play" :size="15" />Watch recorded investigation
        </button>
      </div>
      <RecordedSession v-if="view === 'replay'" :scenario-id="scenarioId" @inspect="inspect" />
      <template v-else>
        <div class="section-heading">
          <h2>{{ groups.length ? 'What the records suggest' : 'The boundary of this dataset' }}</h2>
          <span class="live-label"><span />Interactive evidence</span>
        </div>
        <div v-if="!groups.length" class="insufficient">
          <AppIcon name="search" :size="28" />
          <h2>Insufficient evidence</h2>
          <p>
            No supported subsystem or matching contribution covers disaster recovery. Observability
            and queue reliability work do not establish recovery expertise.
          </p>
          <strong>Missing evidence is not missing ability.</strong>
          <p>
            Next useful evidence: recovery runbooks, restore exercises, and incident-response
            contributions. These are outside this demonstration.
          </p>
        </div>
        <section
          v-for="group in groups"
          :key="group.subsystem.id"
          class="finding-group"
          :aria-label="`${group.subsystem.name} findings`"
        >
          <h3 v-if="groups.length === 1" class="subsystem-heading">{{ group.subsystem.name }}</h3>
          <h2 v-else class="subsystem-heading">{{ group.subsystem.name }}</h2>
          <div class="finding-table-header" aria-hidden="true">
            <span>Contributor & evidence</span><span>Authored</span><span>Reviewed</span><span />
          </div>
          <article
            v-for="finding in group.findings"
            :key="finding.contributor.id"
            class="finding-row"
          >
            <div class="contributor-identity">
              <span class="avatar" :class="finding.contributor.color">{{
                finding.contributor.initials
              }}</span>
              <div>
                <h3>{{ finding.contributor.name }}</h3>
                <span class="classification" :class="finding.classification"
                  ><span />{{ labels[finding.classification] }}</span
                >
              </div>
            </div>
            <span class="count"
              ><strong aria-hidden="true">{{ finding.recentAuthored }}</strong
              ><span class="sr-only"
                >{{ finding.recentAuthored }} recent authored pull requests</span
              ></span
            >
            <span class="count"
              ><strong aria-hidden="true">{{ finding.recentReviewed }}</strong
              ><span class="sr-only"
                >{{ finding.recentReviewed }} recent reviewed pull requests</span
              ></span
            >
            <button
              class="evidence-link"
              :aria-label="`Filter evidence for ${finding.contributor.name} in ${group.subsystem.name}`"
              @click="filterContributor(finding.contributor.id, group.subsystem.id)"
            >
              {{ finding.pullRequestIds.length }} PRs <AppIcon name="arrow" :size="15" />
            </button>
          </article>
        </section>
        <details v-if="groups.length" class="method-note">
          <summary>How are these findings ordered?</summary>
          <p>
            Recent authored PRs first, then recent reviews, latest contribution, and stable
            contributor ID. Recent means within 180 days of June 30, 2026. Counts describe this
            sample, not expertise, ownership, or availability.
          </p>
        </details>
        <div class="lesson">
          <AppIcon name="info" :size="17" />
          <p>{{ scenario.lesson }}</p>
        </div>
        <section class="evidence-list" aria-labelledby="evidence-list-title">
          <div class="section-heading">
            <h2 id="evidence-list-title">
              Pull request evidence <span class="result-count">{{ prs.length }}</span>
            </h2>
            <button class="text-button" @click="clear">Clear filters</button>
          </div>
          <div class="filters">
            <label
              >Subsystem<select v-model="subsystem">
                <option value="">All in investigation</option>
                <option v-for="id in scenario.subsystemIds" :key="id" :value="id">
                  {{ dataset.subsystems.find((s) => s.id === id)?.name }}
                </option>
              </select></label
            ><label
              >Contributor<select v-model="contributor">
                <option value="">All contributors</option>
                <option v-for="c in dataset.contributors" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select></label
            ><label
              >Contribution<select v-model="role" :disabled="!contributor">
                <option value="any">Any contribution</option>
                <option value="author">Authored</option>
                <option value="reviewer">Reviewed</option>
              </select></label
            >
          </div>
          <label class="search-input"
            ><AppIcon name="search" :size="16" /><span class="sr-only">Search pull requests</span
            ><input
              v-model="query"
              type="search"
              :placeholder="scenario.query || 'Search titles, paths, and illustrative changes…'"
          /></label>
          <p v-if="!prs.length" class="empty-message" role="status">
            No pull requests match these filters.
          </p>
          <button
            v-for="pr in prs"
            :key="pr.id"
            class="pr-row"
            :class="{ inspected: selected?.id === pr.id }"
            :aria-label="`Inspect ${pr.id}: ${pr.title}`"
            @click="inspect(pr.id, $event)"
          >
            <AppIcon name="branch" :size="17" /><span class="pr-row-content"
              ><span class="pr-row-title">{{ pr.title }}</span
              ><span class="pr-row-detail"
                ><code>{{ pr.id }}</code
                ><span>{{ person(pr.authorId).name }}</span
                ><span>{{ formattedDate(pr.mergedAt) }}</span></span
              ></span
            ><AppIcon name="chevron" :size="15" />
          </button>
        </section>
      </template>
    </main>
    <EvidencePanel ref="evidencePanel" :pull-request="selected" @close="close" />
  </div>
</template>
