import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { webSearchTool, enhanceMarkdownTool } from './research';

export async function registerTools(server: McpServer) {
  // Register research tools
  await server.tool(
    webSearchTool.name,
    webSearchTool.parameters,
    webSearchTool.handler
  );

  await server.tool(
    enhanceMarkdownTool.name,
    enhanceMarkdownTool.parameters,
    enhanceMarkdownTool.handler
  );

  console.log('Registered MCP tools');
}
