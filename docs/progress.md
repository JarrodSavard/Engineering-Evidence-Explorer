# Implementation ledger

Spec: user's approved Engineering Evidence Explorer plan, 2026-09-25.

- Task 1: dataset and shared engine — complete. Eighteen contributors, four subsystems, 72 independent fictional PRs, a fixed snapshot, deterministic ordering, and explicit evidence classifications.
- Task 2: local MCP integration — complete. Six read-only tools use the shared engine. Integration tests communicate with the real SDK server over stdio.
- Task 3: Nuxt workspace — complete. Three investigations, an 18-person team directory, free-form evidence questions, filters, evidence inspection, responsive layouts, architecture documentation, and accessible focus management.
- Task 4: authentic recording and replay — complete. Three genuine GPT-6 Luna/MCP sessions, reviewed public imports, exact dataset/result validation, citation and recency checks, and manual or timed playback. Raw exports remain private and ignored.
- Task 5: verification and delivery — local verification complete; public deployment is prepared but has not been run. CI and a manual GitHub Pages workflow are included. On September 26, the project was initialized on `main` with `https://github.com/JarrodSavard/Engineering-Evidence-Explorer.git` as its remote for the user-requested first publication.

September 26 publication verification: 37 unit/integration tests and 32 desktop/mobile browser tests pass. Type checks, formatting, all three recording validations, and static generation pass. The staged source was scanned for local secret values and common credential patterns with no findings. The root `LICENSE` reserves Jarrod Savard's rights, permits limited portfolio evaluation, and preserves platform and third-party rights. Local keys, raw recordings, generated videos, build output, and tool caches are excluded from Git.

Earlier verification: the `/ai_mcp/` deployment-path smoke test and the Worker deployment dry run passed. Browser checks covered accessibility, missing/invalid recordings, reduced motion, keyboard access, team filtering, and the free-form live view. Desktop and mobile layouts were inspected. A real local browser-to-Worker-to-GPT-6 Luna-to-MCP custom question succeeded. An adversarial request to reveal instructions and the key was refused. A scan of 63 generated public files found no private key.

Fresh-source verification: copied only project source/configuration and public recordings into a separate ignored temporary directory, without `.env`, private recordings, dependencies, or build output. `npm ci --offline --no-audit` installed the lockfile from the local package cache. `npm run check` then passed all 30 tests, type checks, recording validation, and static generation without AI credentials or raw host exports.

Independent review found missing accessible count labels and third-party notices absent from the generated site. Both are fixed: regression checks cover the count labels, and the deployment-path smoke test verifies the published notice file. The review found no critical issues. Citation validation additionally expands PR ranges so every cited record must have been observed.

September 25 extension: user requested both real GPT-6 Luna recordings and live investigations. Three public recordings were recaptured through the Responses API and a real local MCP client/server connection. All API turns reported `gpt-6-luna`; answers were reviewed and imported without rewriting. A separate Cloudflare Worker now provides optional live runs with the MCP tools, strict origin check, rate limits, a globally coordinated cap of 20 runs per UTC day, bounded tool/model turns, and unseen-citation rejection. `.env.example` and an ignored `.env` support local key setup. The Worker is prepared locally; no remote deployment or public endpoint has been created.

Further extension: visitors can ask a bounded free-text question about the fictional team. Two more read-only MCP tools list people and search PRs. The dataset now contains 18 people and 72 PRs, with fuller profiles and a team directory. The three genuine model recordings were recaptured, reviewed, and revalidated against the new dataset. A recency mistake in an early take was caught during browser review; the public recording was replaced, and deterministic recency-label validation was added for both live answers and recordings.

Initial implementation context: this began as an empty non-Git workspace; no pre-existing branch, history, or worktree was changed.
Ruling: the approved audience, composition, palette, and tone supply design context; no additional design interview is needed.
Pre-flight: Nuxt and MCP share one evidence engine; recordings carry the dataset hash; deployment depends on three valid recordings. Live AI requires a separately deployed Worker and a private server-side API key.
