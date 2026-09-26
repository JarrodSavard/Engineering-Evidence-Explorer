<script setup lang="ts">
import { dataset } from '../../domain/dataset'
import { createEvidenceEngine, normalize } from '../../domain/evidence'
import type { PullRequest } from '../../domain/types'

const engine = createEvidenceEngine(dataset)
const query = ref('')
const subsystem = ref('')
const selected = ref<PullRequest | null>(null)
const panel = ref<{ focusHeading: () => void }>()
let returnFocus: HTMLElement | null = null
const people = computed(() =>
  dataset.contributors
    .filter((person) => {
      const work = engine.getContributorEvidence(person.id)
      if (subsystem.value && !work.some((pr) => pr.subsystemIds.includes(subsystem.value as never)))
        return false
      const words = normalize(query.value).split(' ').filter(Boolean)
      return words.every((word) =>
        normalize(`${person.name} ${person.title} ${person.bio}`).includes(word),
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const workFor = (id: string) => engine.getContributorEvidence(id)
async function inspect(id: string, event: Event) {
  returnFocus = event.currentTarget as HTMLElement
  selected.value = engine.getPullRequest(id)
  await nextTick()
  panel.value?.focusHeading()
}
async function close() {
  selected.value = null
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
}
useHead({ title: 'The fictional team — Evidence Explorer' })
</script>
<template>
  <AppShell>
    <main id="main" class="team-page">
      <div class="team-heading">
        <div>
          <span class="badge fictional">Fictional dataset</span>
          <h1>Meet the Northstar team.</h1>
          <p>
            18 invented engineers, 72 illustrative pull requests, and enough overlap to make
            evidence worth checking. Profiles describe their sample work; they do not certify
            expertise or ownership.
          </p>
        </div>
        <NuxtLink to="/" class="text-button">Explore investigations →</NuxtLink>
      </div>
      <div class="team-layout">
        <div>
          <div class="team-filters">
            <label
              >Search people<input
                v-model="query"
                type="search"
                placeholder="Name, role, or profile…"
            /></label>
            <label
              >Work in subsystem<select v-model="subsystem">
                <option value="">All subsystems</option>
                <option v-for="item in dataset.subsystems" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select></label
            >
          </div>
          <p class="team-count" role="status">
            {{ people.length }} of {{ dataset.contributors.length }} people
          </p>
          <div class="team-grid">
            <article v-for="person in people" :key="person.id" class="team-card">
              <div class="team-card-heading">
                <span class="avatar" :class="person.color">{{ person.initials }}</span>
                <div>
                  <h2>{{ person.name }}</h2>
                  <p>{{ person.title }}</p>
                </div>
              </div>
              <p class="team-bio">{{ person.bio }}</p>
              <details>
                <summary>Inspect {{ workFor(person.id).length }} contributions</summary>
                <ul>
                  <li v-for="pr in workFor(person.id)" :key="pr.id">
                    <button @click="inspect(pr.id, $event)">
                      <code>{{ pr.id }}</code> {{ pr.title }}
                      <span>· {{ pr.role === 'author' ? 'Authored' : 'Reviewed' }}</span>
                    </button>
                  </li>
                </ul>
              </details>
            </article>
          </div>
          <p v-if="!people.length" class="empty-message">
            No fictional engineers match those filters.
          </p>
        </div>
        <EvidencePanel ref="panel" :pull-request="selected" @close="close" />
      </div>
    </main>
  </AppShell>
</template>
