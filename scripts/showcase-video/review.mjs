import { readFile, writeFile } from 'node:fs/promises'
const dir = 'output/showcase-video'
const m = JSON.parse(await readFile(`${dir}/manifest.json`, 'utf8'))
const clock = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const names = [
  'Introduction',
  'Ask',
  'Tool calls',
  'Evidence',
  'Team',
  'Uncertainty',
  'Architecture',
]
const chapters = m.scenes
  .slice(0, 7)
  .map((s, i) => `<button data-time="${s.start}">${clock(s.start)} ${names[i]}</button>`)
  .join('\n')
const html = (await readFile('scripts/showcase-video/review.html', 'utf8'))
  .replace('{{DURATION}}', clock(m.duration))
  .replace('{{VOICE}}', m.voice.name)
  .replace('{{CHAPTERS}}', chapters)
await writeFile(`${dir}/review.html`, html)
const credits = (await readFile(`${dir}/credits.txt`, 'utf8'))
  .replace(/Portfolio showcase — \d+ seconds/, `Portfolio showcase — ${m.duration} seconds`)
  .replace(/Voice: [^,]+, stock male/, `Voice: ${m.voice.name}, stock male`)
await writeFile(`${dir}/credits.txt`, credits)
console.log(`Review updated: ${m.voice.name}, ${clock(m.duration)}`)
