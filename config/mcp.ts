interface ServerConfig {
  name: string;
  version: string;
  port: number;
  host: string;
  path: string;
  environment: 'development' | 'production' | 'test';
}

interface MarkdownConfig {
  contentPath: string;
  allowedExtensions: string[];
}

export interface Config {
  server: ServerConfig;
  markdown: MarkdownConfig;
}

export const config: Config = {
  server: {
    name: process.env.MCP_SERVER_NAME || 'content-farm-mcp',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    port: parseInt(process.env.MCP_PORT || '3000', 10),
    host: process.env.MCP_HOST || '0.0.0.0',
    path: process.env.MCP_PATH || '/mcp',
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  },
  markdown: {
    contentPath: process.env.MARKDOWN_CONTENT_PATH || './content',
    allowedExtensions: ['.md', '.markdown']
  }
};
