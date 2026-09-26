import { mkdir, writeFile, readFile } from 'node:fs/promises'
const folder = 'output/showcase-video'
const voice = { name: 'Eric', id: 'cjVigY5qzO86Huf0OWal', provider: 'ElevenLabs', gender: 'male' }
await mkdir(folder, { recursive: true })
const lines = [
  { id: 'opening', text: 'Who understands this system? Start with the evidence.' },
  {
    id: 'ask',
    text: 'Engineering Evidence Explorer turns a question into an investigation. Ask in your own words, across a fictional team of eighteen engineers and seventy-two pull requests.',
  },
  {
    id: 'tools',
    text: 'Watch the actual M C P tool calls appear. Open the arguments. Inspect the results. Follow the path from your question to the records behind the answer.',
  },
  {
    id: 'evidence',
    text: 'Then go to the source. Read the change, the review, and the illustrative code diff. Authorship and review remain distinct, so every recommendation has context.',
  },
  {
    id: 'team',
    text: 'Explore overlapping experience across authentication, billing, background jobs, and observability. Compare contributions without inventing a universal best person.',
  },
  {
    id: 'uncertainty',
    text: 'And when the records cannot support a recommendation, the answer is clear: insufficient evidence. Missing evidence is not missing ability.',
  },
  {
    id: 'architecture',
    text: 'A Nuxt interface. A shared evidence engine. Read-only tools with explicit limits. Genuine recorded sessions let visitors inspect the integration again.',
  },
  {
    id: 'closing',
    text: 'Built by Jarrod Savard. Engineering Evidence Explorer. Ask better questions. Inspect the evidence.',
  },
]
await writeFile(`${folder}/script.json`, JSON.stringify(lines, null, 2))
await writeFile(
  `${folder}/transcript.txt`,
  lines.map((l) => l.text.replace('M C P', 'MCP')).join('\n\n'),
)
try {
  const cached = JSON.parse(await readFile(`${folder}/narration.json`, 'utf8'))
  if (cached.voice.id === voice.id && cached.request.text === lines.map((l) => l.text).join(' ')) {
    await readFile(`${folder}/narration.mp3`)
    console.log(`Using cached ${voice.name} narration`)
    process.exit(0)
  }
} catch {}
const key = process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY
if (!key) throw new Error('ElevenLabs credential unavailable')
const request = {
  text: lines.map((l) => l.text).join(' '),
  model_id: 'eleven_v3',
  language_code: 'en',
  voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: false },
  seed: 25092026,
}
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`,
  {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(120000),
  },
)
if (!response.ok) {
  const error = await response.json().catch(() => ({}))
  throw new Error(
    `Narration HTTP ${response.status}: ${error.detail?.status || 'synthesis_failed'}`,
  )
}
const data = await response.json()
await writeFile(`${folder}/narration.mp3`, Buffer.from(data.audio_base64, 'base64'))
await writeFile(
  `${folder}/narration.json`,
  JSON.stringify(
    {
      voice,
      request,
      alignment: data.alignment,
      normalized_alignment: data.normalized_alignment,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    voice: voice.name,
    duration: data.alignment.character_end_times_seconds.at(-1),
  }),
)
