import { Notice } from 'obsidian';

// Define the base MCP client interface
interface BaseMcpClient {
  ping(): Promise<boolean>;
  execute(tool: string, params: Record<string, unknown>): Promise<unknown>;
}

// Define interfaces for research results
interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
}

interface ResearchResponse {
  success: boolean;
  query: string;
  results: ResearchResult[];
  summary?: string;
  error?: string;
  timestamp: string;
}

// Extend the base McpClient with our custom methods
interface McpClient extends BaseMcpClient {
  execute(tool: string, params: Record<string, unknown>): Promise<ResearchResponse>;
  ping(): Promise<boolean>;
}

// Simple MCP client implementation
export class MCPClient {
  private client: McpClient | null = null;
  private serverUrl: string = ''; 
  private editor: any;
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  
  // Create a mock client factory function that has access to instance properties
  private createMockClient(): McpClient {
    return {
      ping: async () => {
        console.log('[MCP] Mock ping');
        return true;
      },
      execute: async (toolName: string, params: any) => {
        console.log(`[MCP] Mock executing tool: ${toolName}`, params);
        return {
          success: true,
          results: [
            {
              title: 'Mock Research Result',
              url: 'https://example.com/mock-result',
              snippet: 'This is a mock research result. In a real implementation, this would contain actual research data.',
              source: 'mock',
              relevance: 0.9
            }
          ],
          query: params.query || '',
          timestamp: new Date().toISOString()
        } as ResearchResponse;
      }
    } as McpClient;
  }

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.client = this.createMockClient();
  }

  async connect(serverUrl: string = ''): Promise<boolean> {
    this.serverUrl = serverUrl;
    
    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
      console.warn('Max connection attempts reached');
      return false;
    }

    this.connectionAttempts++;
    
    try {
      this.client = this.createMockClient();
      
      const pingResult = await this.client.ping();
      
      if (pingResult) {
        console.log(`[MCP] Successfully connected to server: ${this.serverUrl}`);
        return true;
      } else {
        throw new Error('Failed to ping server');
      }
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      new Notice('Failed to connect to MCP server');
      return false;
    }
  }

  setEditor(editor: any): void {
    this.editor = editor;
  }

  async enhanceWithResearch(query?: string): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      if (!this.editor) {
        throw new Error('Editor not initialized');
      }

      const content = this.editor.getValue();
      const selection = this.editor.getSelection();
      const researchQuery = query || selection || content.substring(0, 100) + '...';

      console.log(`[MCP] Enhancing content with research for query: ${researchQuery}`);

      const researchResult = await this.client.execute('perplexica_research', {
        query: researchQuery,
        maxResults: 3,
        focus: 'webSearch',
        includeSummary: true
      });

      if (!researchResult.success) {
        throw new Error(researchResult.error || 'Research failed');
      }

      let markdown = '\n\n## Research Results\n\n';
      
      if ('summary' in researchResult && researchResult.summary) {
        markdown += `**Summary**: ${researchResult.summary}\n\n`;
      }

      if ('results' in researchResult && Array.isArray(researchResult.results)) {
        researchResult.results.forEach((result, index) => {
          markdown += `### ${index + 1}. [${result.title}](${result.url})\n`;
          markdown += `**Source**: ${result.source}  \n`;
          markdown += `${result.snippet}\n\n`;
        });
      }

      return markdown;
    } catch (error) {
      console.error('[MCP] Error enhancing content with research:', error);
      throw error;
    }
  }
}
