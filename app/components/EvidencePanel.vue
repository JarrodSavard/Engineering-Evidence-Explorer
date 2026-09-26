<script setup lang="ts">
import { dataset } from '../../domain/dataset'
import type { PullRequest } from '../../domain/types'
defineProps<{ pullRequest: PullRequest | null }>()
const emit = defineEmits<{ close: [] }>()
const heading = ref<HTMLElement>()
function focusHeading() {
  heading.value?.focus()
  heading.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}
defineExpose({ focusHeading })
const person = (id: string) => dataset.contributors.find((c) => c.id === id)?.name || id
</script>
<template>
  <aside class="evidence-panel" aria-label="Pull request evidence" @keydown.esc="emit('close')">
    <div class="panel-label">
      <span><AppIcon name="file" /> Source evidence</span
      ><button
        v-if="pullRequest"
        class="icon-button"
        aria-label="Close evidence"
        @click="emit('close')"
      >
        <AppIcon name="close" /></button
      ><span v-else class="small-dot" />
    </div>
    <template v-if="pullRequest">
      <div class="pr-meta">
        <code>{{ pullRequest.id }}</code
        ><span class="badge neutral">Fictional PR</span>
      </div>
      <h2 ref="heading" tabindex="-1" class="panel-title">{{ pullRequest.title }}</h2>
      <dl class="pr-facts">
        <div>
          <dt>Author</dt>
          <dd>{{ person(pullRequest.authorId) }}</dd>
        </div>
        <div>
          <dt>Merged</dt>
          <dd>{{ pullRequest.mergedAt }}</dd>
        </div>
      </dl>
      <p class="pr-summary">{{ pullRequest.summary }}</p>
      <h3>Illustrative change</h3>
      <div class="diff-file">
        <AppIcon name="code" :size="14" /><code>{{ pullRequest.file }}</code>
      </div>
      <pre
        class="diff"
      ><code><span v-for="(line, i) in pullRequest.diff.split('\n')" :key="i" :class="line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : ''">{{ line }}
</span></code></pre>
      <h3>From the review</h3>
      <blockquote v-for="review in pullRequest.reviews" :key="review.contributorId">
        <p>“{{ review.excerpt }}”</p>
        <cite>{{ person(review.contributorId) }}</cite>
      </blockquote>
      <p class="panel-note">
        Independently authored example. This snippet illustrates intent; it is not production code.
      </p>
    </template>
    <div v-else class="panel-empty">
      <div class="evidence-illustration" aria-hidden="true">
        <span class="illustration-document"><i /><i /><i /><i /></span
        ><span class="illustration-link"><AppIcon name="branch" :size="22" /></span>
      </div>
      <h2>Follow the evidence.</h2>
      <p>
        Open a pull request to see what changed, who contributed, and what the review actually says.
      </p>
      <div class="panel-principle">
        <AppIcon name="info" />
        <p>A contribution is a signal.<br />It is not a claim of ownership.</p>
      </div>
    </div>
  </aside>
</template>
