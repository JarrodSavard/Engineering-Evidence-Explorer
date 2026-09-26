<script setup lang="ts">
import { dataset } from '../../domain/dataset'
import { createEvidenceEngine } from '../../domain/evidence'
import { scenarios } from '../../domain/scenarios'
import type { PullRequest } from '../../domain/types'

const engine = createEvidenceEngine(dataset)
const selected = ref<PullRequest | null>(null)
const evidencePanel = ref<{ focusHeading: () => void }>()
let returnFocus: HTMLElement | null = null

async function inspect(id: string, event: Event) {
  returnFocus = event.currentTarget as HTMLElement
  selected.value = engine.getPullRequest(id)
  await nextTick()
  evidencePanel.value?.focusHeading()
}

async function close() {
  selected.value = null
  await nextTick()
  if (returnFocus?.isConnected) returnFocus.focus()
}

useHead({ title: 'Ask the evidence — Engineering Evidence Explorer' })
</script>

<template>
  <div class="ask-workspace">
    <main id="main" class="ask-main">
      <div class="ask-eyebrow">
        <span class="ask-live-dot" /> LIVE MCP WORKSPACE <span class="ask-eyebrow-line" /> FICTIONAL
        TEAM
      </div>
      <header class="ask-hero">
        <div>
          <h1>Ask the <em>evidence.</em></h1>
          <p>
            Investigate a fictional engineering team in your own words. See the answer, the MCP tool
            calls, and the pull requests that support it.
          </p>
        </div>
        <div class="ask-index" aria-label="Dataset snapshot">
          <span>01 / NORTHSTAR</span>
          <strong
            >{{ dataset.contributors.length }} engineers<br />{{ dataset.pullRequests.length }} pull
            requests</strong
          >
          <small>Fixed snapshot · June 30, 2026</small>
        </div>
      </header>

      <LiveInvestigation scenario-id="open-question" @inspect="inspect" />

      <section class="ask-examples" aria-labelledby="example-title">
        <div class="ask-section-heading">
          <span>START SOMEWHERE</span>
          <h2 id="example-title">Three guided investigations</h2>
          <p>
            Prefer to browse? Each investigation has interactive records and a recorded AI session.
          </p>
        </div>
        <div class="ask-scenarios">
          <NuxtLink
            v-for="(scenario, index) in scenarios"
            :key="scenario.id"
            :to="`/investigations/${scenario.id}`"
            class="ask-scenario"
          >
            <span class="ask-scenario-number">0{{ index + 1 }}</span>
            <span class="ask-scenario-content"
              ><strong>{{ scenario.name }}</strong
              ><small>{{ scenario.description }}</small></span
            >
            <AppIcon name="arrow" :size="18" />
          </NuxtLink>
        </div>
      </section>
    </main>
    <EvidencePanel ref="evidencePanel" :pull-request="selected" @close="close" />
  </div>
</template>
