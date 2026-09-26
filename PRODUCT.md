# Engineering Evidence Explorer

Approved audience: engineering hiring managers and technical interviewers reviewing Jarrod Savard's portfolio.

Purpose: investigate a fictional engineering team, verify recommendations against pull requests, inspect genuine recorded AI/MCP sessions, and optionally run a live GPT-6 Luna investigation. Success is understanding the project in two minutes and being able to trace a claim to its source and implementation.

Approved design: focused investigation workspace with scenario navigation, central findings, and an evidence panel; responsive stacked sections on mobile. Light surfaces, dark text, restrained teal accents, monospace only for technical details. Calm, precise, transparent, editorial rather than a chat product.

Constraints: Nuxt 4 static website, public full demonstration source, fixed fictional records, no ingestion or real organizations. MCP works locally over stdio. Optional live questions about those records go through a separately deployed, rate-limited Cloudflare Worker that keeps the API key private. Recorded events and live results are separately labeled. No unsupported skill or ownership claims.
