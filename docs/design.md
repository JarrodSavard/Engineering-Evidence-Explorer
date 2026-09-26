# Approved design and implementation boundary

Build a public Nuxt 4 portfolio demonstrating evidence-backed engineering contributor discovery. The visitor is a hiring manager or technical interviewer. A guided investigation should be understandable in two minutes and support deeper inspection of source records and code.

The approved composition is scenario navigation, central findings, and a source-evidence panel, stacked on mobile. Light surfaces, dark text, restrained teal, and technical monospace only where useful. The interface distinguishes fiction, deterministic exploration, and genuine recorded AI sessions.

Three scenarios: authentication reviewer, complementary billing/background-jobs reviewers, and insufficient disaster-recovery evidence. The expanded fixed dataset has eighteen contributors, four subsystems, seventy-two PRs, and a June 30, 2026 snapshot. Ranking prioritizes recent authored counts, recent reviews, latest contribution, and stable ID; recent means an inclusive 180-day window. Cross-subsystem findings stay separate.

A shared TypeScript engine serves the browser and a read-only local stdio MCP server with six strictly validated tools. An optional, separately hosted Cloudflare Worker offers live GPT-6 Luna answers to bounded free-text questions about the fictional records. It keeps the API key server-side, calls the same MCP tools in memory, and limits origin, request size, frequency, daily usage, model turns, and tool calls. There is no repository connector, ingestion, account, upload, or arbitrary filesystem access. Full demo source is inspectable.

Capture three genuine GPT-6 Luna sessions through the Responses API and local MCP server. Keep raw exports private to the local ignored directory. Preserve visible conversation, actual arguments/results, timing, provenance, and evidence references. Publish no hidden reasoning. Validate hash, outputs, citations, and structure; manually review answer claims. Require three valid sessions before release. Playback is labeled, starts manually, supports stepping and evidence links, and honors reduced motion.

Deliver unit/integration/browser tests, type checks, static build, local instructions, copyright/third-party notices, CI, and a manual GitHub Pages workflow. Publication itself is a separate external action after the source is placed in a repository.
