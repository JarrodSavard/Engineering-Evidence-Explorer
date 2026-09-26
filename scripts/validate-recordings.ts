import { readFile } from 'node:fs/promises'
import { validateReplay } from '../domain/replay'
import { scenarios } from '../domain/scenarios'

let valid = 0
for (const scenario of scenarios) {
  try {
    const raw = await readFile(`public/recordings/${scenario.id}.json`, 'utf8')
    const session = await validateReplay(JSON.parse(raw))
    if (session.scenarioId !== scenario.id)
      throw new Error('Recording filename does not match scenario')
    console.log(`Valid: ${scenario.id} (${session.events.length} events)`)
    valid++
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === 'ENOENT' &&
      !process.argv.includes('--require-complete')
    ) {
      console.log(`Unavailable: ${scenario.id}`)
    } else {
      console.error(`${scenario.id}: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }
}
console.log(`${valid}/${scenarios.length} recordings validated`)
