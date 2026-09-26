import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { createEvidenceServer } from './create-server'

await createEvidenceServer().connect(new StdioServerTransport())
