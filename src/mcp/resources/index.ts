import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/resource';
import { MarkdownFileResource } from './markdown';

export async function registerResources(server: McpServer) {
  // Register markdown file resource
  await server.resource(
    'markdown',
    new ResourceTemplate('markdown://{filePath}'),
    async (uri, { filePath }) => {
      const resource = new MarkdownFileResource();
      return resource.read(new URL(`markdown://${filePath}`));
    }
  );

  console.log('Registered MCP resources');
}
