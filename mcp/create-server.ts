import { McpServer } from '@modelcontextprotocol/server'
import { executeTool, toolDescriptions, toolNames, toolSchemas } from '../domain/tools'

export function createEvidenceServer() {
  const server = new McpServer({ name: 'northstar-evidence', version: '1.0.0' })
  for (const name of toolNames) {
    server.registerTool(
      name,
      {
        description: toolDescriptions[name],
        inputSchema: toolSchemas[name],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (input: unknown) => {
        try {
          const result = executeTool(name, input)
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
            structuredContent: result,
          }
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: error instanceof Error ? error.message : 'Unable to read evidence.',
              },
            ],
          }
        }
      },
    )
  }
  return server
}
