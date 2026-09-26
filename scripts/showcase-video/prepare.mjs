import { readFile, writeFile, copyFile } from 'node:fs/promises'
const dir = 'output/showcase-video'
const lines = JSON.parse(await readFile(`${dir}/script.json`, 'utf8'))
const narration = JSON.parse(await readFile(`${dir}/narration.json`, 'utf8'))
const a = narration.alignment
const text = a.characters.join('')
let cursor = 0
const offset = 1.2
const scenes = lines.map((line) => {
  const start = text.indexOf(line.text, cursor)
  if (start < 0) throw new Error(`Alignment mismatch: ${line.id}`)
  cursor = start + line.text.length
  return {
    ...line,
    start: offset + a.character_start_times_seconds[start],
    end: offset + a.character_end_times_seconds[cursor - 1],
  }
})
const words = [...text.matchAll(/\S+/g)].map((m) => ({
  text: m[0],
  start: offset + a.character_start_times_seconds[m.index],
  end: offset + a.character_end_times_seconds[m.index + m[0].length - 1],
}))
const captions = []
let sentence = []
function finishSentence() {
  const parts = Math.ceil(sentence.map((w) => w.text).join(' ').length / 65)
  const size = Math.ceil(sentence.length / parts)
  for (let i = 0; i < sentence.length; i += size) {
    const group = sentence.slice(i, i + size)
    captions.push({
      text: group
        .map((w) => w.text)
        .join(' ')
        .replace('M C P', 'MCP'),
      start: group[0].start,
      end: group.at(-1).end + 0.08,
    })
  }
  sentence = []
}
for (const word of words) {
  sentence.push(word)
  if (/[.!?]$/.test(word.text)) finishSentence()
}
if (sentence.length) finishSentence()
captions.forEach((c, i) => {
  c.end = Math.min(c.end, (captions[i + 1]?.start ?? Infinity) - 0.01)
})
const duration = Math.ceil(scenes.at(-1).end + 2.5)
scenes[0].start = 0
scenes.forEach((s, i) => {
  s.end = scenes[i + 1]?.start ?? duration
})
const manifest = {
  duration,
  fps: 30,
  width: 3840,
  height: 2160,
  scenes,
  captions,
  voice: narration.voice,
  capture:
    'Genuine local live request and actual application screenshots; editorial timing compressed',
  dataset: 'Entirely fictional; June 30, 2026 snapshot',
}
await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2))
await writeFile(`${dir}/manifest.js`, `window.FILM = ${JSON.stringify(manifest)};`)
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`
}
await writeFile(
  `${dir}/captions.srt`,
  captions
    .map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`)
    .join('\n'),
)
await writeFile(
  `${dir}/captions.vtt`,
  'WEBVTT\n\n' +
    captions.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'),
)
await copyFile(
  'node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2',
  `${dir}/assets/serif.woff2`,
)
await copyFile(
  'node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff2',
  `${dir}/assets/serif-italic.woff2`,
)
await copyFile(
  'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2',
  `${dir}/assets/sans.woff2`,
)
await copyFile('scripts/showcase-video/film.html', `${dir}/film.html`)
console.log(
  JSON.stringify({
    duration,
    scenes: scenes.map((s) => ({ id: s.id, start: s.start, end: s.end })),
    captions: captions.length,
  }),
)
