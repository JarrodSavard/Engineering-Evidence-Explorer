<script setup lang="ts">
import { datasetHash } from '../../domain/replay'
import { liveResultSchema, type LiveResult } from '../../domain/live-contract'
import { readLiveStream } from '../../domain/live-stream'

const props = defineProps<{ scenarioId: string }>()
const emit = defineEmits<{ inspect: [id: string, event: Event] }>()
const config = useRuntimeConfig()
const apiUrl = String(config.public.liveApiUrl || '').replace(/\/$/, '')
const state = ref<'idle' | 'running' | 'ready' | 'error'>('idle')
const result = ref<LiveResult | null>(null)
const trace = ref<LiveResult['tools']>([])
const traceHeading = ref<HTMLElement>()
const errorText = ref('')
const question = ref('')
const customQuestion = computed(() => question.value.trim())
const segments = (text: string) => text.split(/(\*\*[^*]+\*\*)/g)
const callArguments = (tool: LiveResult['tools'][number]) =>
  Object.entries(tool.arguments)
    .map(([name, value]) => `${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ') || 'No arguments'
let abort: AbortController | undefined
async function run() {
  if (!apiUrl || state.value === 'running' || customQuestion.value.length < 8) return
  abort?.abort()
  abort = new AbortController()
  state.value = 'running'
  result.value = null
  trace.value = []
  errorText.value = ''
  try {
    const response = await fetch(`${apiUrl}/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify({
        scenarioId: props.scenarioId,
        question: customQuestion.value,
      }),
      signal: abort.signal,
    })
    if (!response.ok) {
      const data: unknown = await response.json()
      const message =
        typeof data === 'object' && data !== null && 'error' in data ? String(data.error) : ''
      throw new Error(message || 'The live investigation is unavailable.')
    }
    let parsed: LiveResult
    if (response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
      if (!response.body) throw new Error('The live service returned no event stream.')
      let completed: LiveResult | null = null
      for await (const event of readLiveStream(response.body)) {
        if (event.type === 'tool') {
          const first = trace.value.length === 0
          trace.value = [...trace.value, event.tool]
          if (first) {
            await nextTick()
            traceHeading.value?.scrollIntoView({
              block: 'start',
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
            })
          }
        } else if (event.type === 'complete') completed = event.result
        else throw new Error(event.error)
      }
      if (!completed) throw new Error('The live investigation ended without a verified answer.')
      parsed = completed
    } else {
      parsed = liveResultSchema.parse(await response.json())
      trace.value = parsed.tools
    }
    if (
      parsed.scenarioId !== props.scenarioId ||
      parsed.datasetHash !== (await datasetHash()) ||
      parsed.question !== customQuestion.value
    )
      throw new Error('The live result uses a different dataset. Try the recording.')
    result.value = parsed
    state.value = 'ready'
  } catch (error) {
    if (!abort.signal.aborted) {
      state.value = 'error'
      errorText.value =
        error instanceof TypeError
          ? 'Could not connect to the live service. Check that the local live service is running, then try again.'
          : error instanceof Error
            ? error.message
            : 'The live investigation is unavailable.'
    }
  }
}
watch(
  () => props.scenarioId,
  () => {
    abort?.abort()
    question.value = ''
    result.value = null
    trace.value = []
    state.value = 'idle'
  },
)
onBeforeUnmount(() => abort?.abort())
</script>
<template>
  <section class="live-session" aria-label="Live AI investigation">
    <div class="recording-heading">
      <span class="badge neutral"><AppIcon name="code" :size="12" /> Live MCP</span>
      <span>Real AI · inspectable tool calls</span>
    </div>
    <div class="live-intro">
      <h2>Start with a question.</h2>
      <p>
        Ask about the people, systems, or pull requests. The AI assistant uses read-only MCP
        evidence tools. Its answer and tool calls appear below so you can check each claim.
      </p>
      <form v-if="apiUrl" class="live-question-form" @submit.prevent="run">
        <label for="live-question">Your question <span>up to 400 characters</span></label>
        <textarea
          id="live-question"
          v-model="question"
          maxlength="400"
          minlength="8"
          required
          rows="3"
          placeholder="For example: Who reviewed queue reliability changes, and what did they question?"
          :disabled="state === 'running'"
        />
        <p class="live-question-hint">
          {{ customQuestion.length }} / 400 ·
          {{
            customQuestion.length > 0 && customQuestion.length < 8
              ? 'Write at least 8 characters.'
              : 'Questions are limited to this fictional team and its records.'
          }}
        </p>
        <button
          class="button-primary"
          type="submit"
          :disabled="state === 'running' || customQuestion.length < 8"
        >
          {{
            state === 'running'
              ? 'Investigating…'
              : result
                ? 'Ask another question'
                : 'Investigate question'
          }}
        </button>
      </form>
      <p v-else class="empty-message" role="status">
        Live questions are not connected on this preview. You can explore the fictional records in
        the investigations.
      </p>
    </div>
    <p v-if="state === 'running'" role="status" class="live-status">
      {{
        trace.length
          ? `${trace.length} MCP ${trace.length === 1 ? 'call' : 'calls'} completed. Checking the evidence…`
          : 'Connecting to the evidence tools…'
      }}
    </p>
    <p v-if="state === 'error'" role="alert" class="live-error">{{ errorText }}</p>
    <section v-if="trace.length" class="live-trace" aria-labelledby="live-trace-title">
      <div class="live-trace-heading">
        <span>OBSERVABLE ACTIVITY</span>
        <h3 id="live-trace-title" ref="traceHeading">
          Observed MCP calls <span class="result-count">{{ trace.length }}</span>
        </h3>
        <p>
          These are actual read-only tool calls and returned records. Private model reasoning is not
          available.
        </p>
      </div>
      <ol class="live-trace-list">
        <li v-for="(tool, index) in trace" :key="index" class="live-trace-step">
          <details :open="index === trace.length - 1">
            <summary class="live-trace-call">
              <span class="live-trace-number" aria-hidden="true">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <span class="live-trace-call-name"
                ><code>{{ tool.name }}</code
                ><small>{{ callArguments(tool) }}</small></span
              >
              <span class="live-trace-duration">{{ tool.durationMs }} ms</span>
              <AppIcon name="chevron" :size="14" />
            </summary>
            <div class="live-trace-data">
              <div>
                <strong>Arguments sent</strong>
                <pre>{{ JSON.stringify(tool.arguments, null, 2) }}</pre>
              </div>
              <div>
                <strong>Result returned</strong>
                <pre>{{ JSON.stringify(tool.result, null, 2) }}</pre>
              </div>
            </div>
          </details>
        </li>
      </ol>
    </section>
    <template v-if="state === 'ready' && result">
      <p class="live-asked">
        <strong>Question:</strong>
        {{ result.question }}
      </p>
      <article class="replay-event">
        <div class="event-who">
          <span class="event-avatar">AI</span><strong>Live model answer</strong>
        </div>
        <div class="message-text">
          <template v-for="(segment, index) in segments(result.answer)" :key="index"
            ><strong v-if="segment.startsWith('**')">{{ segment.slice(2, -2) }}</strong
            ><template v-else>{{ segment }}</template></template
          >
        </div>
        <div v-if="result.evidenceIds.length" class="citation-list">
          <button
            v-for="id in result.evidenceIds"
            :key="id"
            :aria-label="`Inspect ${id} from live answer`"
            @click="emit('inspect', id, $event)"
          >
            <AppIcon name="file" :size="13" />{{ id }}
          </button>
        </div>
      </article>
      <p class="recording-disclosure">
        {{ result.generatedAt.slice(0, 10) }} · Fictional records. This answer was generated now;
        inspect its evidence before relying on it.
      </p>
    </template>
  </section>
</template>
