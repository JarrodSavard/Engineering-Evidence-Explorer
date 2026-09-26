import { copyFile } from 'node:fs/promises'
// Keep notices beside distributed fonts and scripts, including in a standalone static upload.
await copyFile('THIRD_PARTY_NOTICES.md', 'public/third-party-notices.txt')
