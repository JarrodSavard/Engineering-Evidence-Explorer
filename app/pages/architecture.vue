<template>
  <AppShell
    ><main id="main" class="architecture-page">
      <NuxtLink to="/" class="text-button">← Back to Ask the evidence</NuxtLink>
      <h1>Small by design.<br /><em>Open to inspection.</em></h1>
      <p class="architecture-intro">
        A complete demonstration of how engineering evidence becomes a useful answer—and where that
        answer should stop.
      </p>
      <div class="architecture-flow">
        <div><strong>Fictional records</strong><span>18 people · 72 pull requests</span></div>
        <AppIcon name="arrow" />
        <div>
          <strong>Shared evidence engine</strong><span>Deterministic, tested retrieval</span>
        </div>
        <AppIcon name="arrow" />
        <div><strong>Three ways to inspect</strong><span>Evidence · replay · live AI</span></div>
      </div>
      <section>
        <h2>One source of truth</h2>
        <p>
          The browser and the local MCP server use the same TypeScript evidence engine. Both filter
          the same fixed records and apply the same ordering: recent authored pull requests, recent
          reviews, latest contribution, then stable ID. “Recent” is measured against June 30, 2026,
          not today's date.
        </p>
        <p>
          No embeddings, vector database, or model-generated expertise scores. Every finding points
          back to its sources. Authorship, review activity, historical work, and missing evidence
          remain separate signals.
        </p>
      </section>
      <section>
        <h2>Real MCP. Recorded and live AI.</h2>
        <p>
          The local read-only server exposes six tools: list_subsystems, list_contributors,
          search_pull_requests, find_contributors, get_contributor_evidence, and get_pull_request.
          An AI host calls these tools over stdio. The reviewed recordings preserve its actual tool
          calls and visible answer. The live route uses a protected Worker: it gives the AI
          assistant the same tools through a local MCP client/server connection. The API key stays
          on the Worker.
        </p>
        <p>
          Recordings preserve the actual visible assistant responses and tool results. A dataset
          hash, exact tool-output comparisons, citation checks, and a manual claim review guard
          against stale or unsupported evidence. Playback timing is compressed; recorded tool
          durations are shown separately.
        </p>
        <p>
          Live visitors can ask their own bounded question about the fictional records. The Worker
          limits requests per visitor and location, and a durable daily cap limits total runs. The
          model gets read-only evidence tools, never browser or shell access. Its answer is checked
          for unseen PR citations before it reaches the page.
        </p>
        <p>
          Each completed MCP call streams to the live page with its arguments and returned record.
          The final answer appears only after evidence checks pass. The visible timeline is an
          execution trace; private model reasoning is not available.
        </p>
      </section>
      <section>
        <h2>The limits are part of the design</h2>
        <p>
          All people, pull requests, and code excerpts are independently authored fiction. There are
          no real repository connections, uploads, accounts, or ingestion pipelines. Contributions
          do not establish ownership, availability, or someone's overall ability. The
          disaster-recovery investigation deliberately ends with insufficient evidence.
        </p>
      </section>
      <section>
        <h2>What is verified</h2>
        <p>
          Unit tests exercise date boundaries, role distinctions, ordering, empty results, and
          invalid identifiers. Integration tests connect a real MCP client to the server. Browser
          tests cover evidence navigation, filters, recordings, accessibility, mobile layout, and
          the live route's input and usage limits. Release validation requires all three reviewed
          recordings. Browsing evidence and watching recordings make no model request.
        </p>
      </section>
      <section id="source">
        <h2>Review the implementation</h2>
        <p>
          The project includes the Nuxt interface, fictional dataset, shared retrieval engine, local
          MCP server, tests, and recording utilities. The README provides setup commands and
          explains the implementation boundaries.
        </p>
        <p>
          Copyright Jarrod Savard. The demonstration is intended for inspection; no broad reuse
          license is granted automatically. Dependency licenses remain their own.
        </p>
        <p class="panel-note">
          The repository link appears in the navigation when its public URL is configured. This
          local build does not invent a repository address.
        </p>
      </section>
    </main></AppShell
  >
</template>
