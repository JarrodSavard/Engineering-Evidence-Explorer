import { readFile, writeFile, readdir } from 'node:fs/promises'
const project = JSON.parse(await readFile('package.json', 'utf8'))
let text =
  '# Third-party notices\n\nOriginal project code: copyright 2026 Jarrod Savard; no broad reuse license is granted. The packages below keep their own licenses. Their license grants do not apply to original project code. Font assets are self-hosted.\n\n'
for (const name of Object.keys(project.dependencies)) {
  const directory = `node_modules/${name}`
  const pkg = JSON.parse(await readFile(`${directory}/package.json`, 'utf8'))
  text += `## ${name} ${pkg.version}\n\nDeclared license: ${pkg.license}.\n\n`
  const files = (await readdir(directory)).filter((file) =>
    /^(license|ofl|notice)(\.|$)/i.test(file),
  )
  if (!files.length)
    text += `License and source: https://www.npmjs.com/package/${name}/v/${pkg.version}\n\n`
  for (const file of files)
    text += `### ${file}\n\n\x60\x60\x60text\n${await readFile(`${directory}/${file}`, 'utf8')}\n\x60\x60\x60\n\n`
}
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
text +=
  '## Resolved dependency inventory\n\nIncludes development tooling. Consult each package for its full license text; package managers retain those files when installing.\n\n| Package | Version | Declared license |\n| --- | --- | --- |\n'
for (const [path, pkg] of Object.entries(lock.packages) as [string, any][]) {
  if (!path || !pkg.version) continue
  const name = path.split('node_modules/').at(-1)
  text += `| ${name} | ${pkg.version} | ${pkg.license || 'See package'} |\n`
}
await writeFile('THIRD_PARTY_NOTICES.md', text)
