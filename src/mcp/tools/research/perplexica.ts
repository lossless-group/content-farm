import { z } from 'zod';

// Define types for research results
export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
}

export interface ResearchResponse {
  success: boolean;
  query: string;
  results: ResearchResult[];
  timestamp: string;
  summary?: string;
  error?: string;
}

// Define schema for Perplexica parameters
export const PerplexicaParamsSchema = z.object({
  query: z.string().describe('The research query to perform'),
  maxResults: z.number().int().min(1).max(10).optional().default(3)
    .describe('Maximum number of results to return'),
  focus: z.enum(['webSearch', 'academic', 'news', 'all']).optional().default('webSearch')
    .describe('Search focus area'),
  includeSummary: z.boolean().optional().default(true)
    .describe('Whether to include a summary of results'),
  timeout: z.number().int().positive().optional().default(10000)
    .describe('Timeout in milliseconds for the research request')
});

// Define the tool implementation
export const perplexicaTool = {
  name: 'perplexica_research',
  description: 'Perform web research using Perplexica to enhance content with relevant information',
  parameters: PerplexicaParamsSchema,
  
  async execute(params: unknown): Promise<ResearchResponse> {
    try {
      // Validate input parameters
      const { query, maxResults = 3, focus = 'webSearch', includeSummary = true } = 
        PerplexicaParamsSchema.parse(params);
      
      console.log(`[Perplexica] Searching for: ${query} (focus: ${focus}, maxResults: ${maxResults})`);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock results with proper typing
      const results: ResearchResult[] = Array.from({ length: maxResults }, (_, i) => ({
        title: `${query} - Result ${i + 1}`,
        url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
        snippet: `This is a mock result for "${query}" (${focus}). ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(2)}`,
        source: 'example.com',
        relevance: 1 - (i * 0.2), // Simulate decreasing relevance
      }));

      const response: ResearchResponse = {
        success: true,
        query,
        results,
        timestamp: new Date().toISOString(),
      };

      if (includeSummary) {
        // Add summary to the response
        (response as any).summary = `Found ${results.length} results for "${query}" with focus on ${focus}.`;
      }

      return response;
    } catch (error) {
      console.error('[Perplexica] Error executing research:', error);
      return {
        success: false,
        query: typeof params === 'object' && params !== null && 'query' in params 
          ? String((params as any).query) 
          : 'unknown',
        results: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};

export default perplexicaTool;
