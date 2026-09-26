import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { dataset } from '../domain/dataset'
import { createEvidenceEngine } from '../domain/evidence'

describe('real stdio MCP boundary', () => {
  const client = new Client({ name: 'evidence-integration-test', version: '1.0.0' })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'mcp/server.ts'],
    stderr: 'pipe',
  })
  beforeAll(async () => {
    await client.connect(transport)
  })
  afterAll(async () => {
    await client.close()
  })
  it('discovers the six read-only evidence tools', async () => {
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual([
      'find_contributors',
      'get_contributor_evidence',
      'get_pull_request',
      'list_contributors',
      'list_subsystems',
      'search_pull_requests',
    ])
  })
  it('searches PRs through the protocol without accepting arbitrary paths', async () => {
    const result = await client.callTool({
      name: 'search_pull_requests',
      arguments: { query: 'token rotation' },
    })
    expect(result.structuredContent).toMatchObject({
      pullRequests: expect.arrayContaining([expect.objectContaining({ id: 'PR-101' })]),
    })
    const invalid = await client.callTool({
      name: 'search_pull_requests',
      arguments: { query: 'token', path: '../private' },
    })
    expect(invalid.isError).toBe(true)
  })
  it('returns the same contribution evidence as the browser engine', async () => {
    const response = await client.callTool({
      name: 'find_contributors',
      arguments: { subsystemId: 'authentication' },
    })
    expect(response.isError).not.toBe(true)
    expect(response.structuredContent).toEqual({
      findings: createEvidenceEngine(dataset).findContributors('authentication'),
    })
  })
  it('returns source records over the protocol', async () => {
    const response = await client.callTool({
      name: 'get_pull_request',
      arguments: { pullRequestId: 'PR-101' },
    })
    expect(response.structuredContent).toMatchObject({
      pullRequest: { id: 'PR-101', authorId: 'maya' },
    })
  })
  it('rejects invalid identifiers and arbitrary path fields', async () => {
    const missing = await client.callTool({
      name: 'get_pull_request',
      arguments: { pullRequestId: '../secret' },
    })
    expect(missing.isError).toBe(true)
    const invalid = await client.callTool({
      name: 'find_contributors',
      arguments: { subsystemId: 'disaster-recovery' },
    })
    expect(invalid.isError).toBe(true)
    const extra = await client.callTool({
      name: 'list_subsystems',
      arguments: { path: '/private' },
    })
    expect(extra.isError).toBe(true)
  })
})
