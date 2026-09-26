<script setup lang="ts">
import { validateReplay, type ReplaySession } from '../../domain/replay'
const props = defineProps<{ scenarioId: string }>()
const emit = defineEmits<{ inspect: [id: string, event: Event] }>()
const config = useRuntimeConfig()
const session = ref<ReplaySession | null>(null)
const state = ref<'loading' | 'ready' | 'unavailable'>('loading')
const index = ref(0),
  playing = ref(false),
  reduced = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
const abort = new AbortController()
const current = computed(() => session.value?.events[index.value])
const last = computed(() => (session.value?.events.length || 1) - 1)
function stop() {
  playing.value = false
  if (timer) clearInterval(timer)
  timer = undefined
}
function step(delta: number) {
  stop()
  index.value = Math.min(last.value, Math.max(0, index.value + delta))
}
function jump(position: number) {
  stop()
  index.value = position
}
function play() {
  if (playing.value) return stop()
  if (index.value === last.value) index.value = 0
  playing.value = true
  timer = setInterval(() => {
    if (index.value >= last.value) stop()
    else index.value++
  }, 2400)
}
onMounted(async () => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    const response = await fetch(`${config.app.baseURL}recordings/${props.scenarioId}.json`, {
      signal: abort.signal,
    })
    if (!response.ok) throw new Error('Recording unavailable')
    const recording = await validateReplay(await response.json())
    if (recording.scenarioId !== props.scenarioId) throw new Error('Wrong recording')
    session.value = recording
    state.value = 'ready'
  } catch {
    if (!abort.signal.aborted) state.value = 'unavailable'
  }
})
onBeforeUnmount(() => {
  abort.abort()
  stop()
})
const segments = (text: string) => text.split(/(\*\*[^*]+\*\*)/g)
</script>
<template>
  <section class="recording" aria-label="Recorded investigation">
    <div class="recording-heading">
      <span class="badge neutral"><AppIcon name="play" :size="12" /> Recorded AI session</span
      ><span>No live AI requests</span>
    </div>
    <p class="recording-scope">
      The steps show captured messages and MCP calls. Private model reasoning was not recorded.
    </p>
    <p v-if="state === 'loading'" role="status" class="empty-message">Loading the recording…</p>
    <div v-else-if="state === 'unavailable'" class="empty-message">
      <h2>Recording unavailable</h2>
      <p>
        This session could not be loaded or verified. You can still explore the evidence; no
        generated answer has been substituted.
      </p>
    </div>
    <template v-else-if="session && current">
      <div class="playback-toolbar">
        <div class="playback-buttons">
          <button :disabled="index === 0" @click="step(-1)">Previous</button
          ><button
            v-if="!reduced"
            class="button-primary"
            :aria-label="playing ? 'Pause recording' : 'Play recording'"
            @click="play"
          >
            <AppIcon :name="playing ? 'pause' : 'play'" :size="14" />{{
              playing ? 'Pause' : 'Play'
            }}</button
          ><button :disabled="index === last" @click="step(1)">Next</button>
        </div>
        <span role="status">Step {{ index + 1 }} of {{ session.events.length }}</span>
      </div>
      <div class="recording-track" aria-hidden="true">
        <span v-for="(_, i) in session.events" :key="i" :class="{ passed: i <= index }" />
      </div>
      <article class="replay-event" :key="index">
        <template v-if="current.type === 'tool'">
          <div class="event-who">
            <AppIcon name="code" /><strong>MCP tool result</strong
            ><span>{{ current.durationMs }} ms recorded</span>
          </div>
          <h2 class="tool-name">{{ current.name }}</h2>
          <details open>
            <summary>Arguments</summary>
            <pre>{{ JSON.stringify(current.arguments, null, 2) }}</pre>
          </details>
          <details>
            <summary>Captured result</summary>
            <pre>{{ JSON.stringify(current.result, null, 2) }}</pre>
          </details>
        </template>
        <template v-else>
          <div class="event-who">
            <span class="event-avatar">{{ current.type === 'user' ? 'Q' : 'AI' }}</span
            ><strong>{{
              current.type === 'user' ? 'Investigation prompt' : 'Recorded assistant'
            }}</strong>
          </div>
          <div class="message-text">
            <template v-for="(segment, i) in segments(current.text)" :key="i"
              ><strong v-if="segment.startsWith('**')">{{ segment.slice(2, -2) }}</strong
              ><template v-else>{{ segment }}</template></template
            >
          </div>
          <div v-if="current.evidenceIds.length" class="citation-list">
            <button
              v-for="id in current.evidenceIds"
              :key="id"
              :aria-label="`Inspect ${id} from recording`"
              @click="emit('inspect', id, $event)"
            >
              <AppIcon name="file" :size="13" />{{ id }}
            </button>
          </div>
        </template>
      </article>
      <div class="replay-actions">
        <button class="text-button" @click="jump(0)">Restart</button
        ><button class="text-button" @click="jump(last)">
          Show final answer <AppIcon name="arrow" :size="14" />
        </button>
      </div>
      <p class="recording-disclosure">
        {{ session.host }} · {{ session.recordedAt.slice(0, 10) }}<br />Playback uses a compressed
        pace. Tool durations are measured from host events, including transport.
        {{
          reduced
            ? 'Reduced motion: manual stepping enabled.'
            : 'Playback begins only when you press Play.'
        }}
      </p>
    </template>
  </section>
</template>
