import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { FastifyTransport } from './transports/fastify';
import type { Implementation } from '@modelcontextprotocol/sdk/types';
import type { Config } from '../../config/mcp';

// Import config
const config: Config = (await import('../../config/mcp.js')).config;

// Define server info
const SERVER_INFO: Implementation = {
  name: 'content-farm-mcp',
  version: '0.1.0',
  description: 'MCP server for Content Farm',
};

// Import register functions
const { registerResources } = await import('./resources/index.js');
const { registerTools } = await import('./tools/index.js');

// Create Fastify server instance
const server: FastifyInstance = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  disableRequestLogging: process.env.NODE_ENV === 'production',
});

// Register CORS with secure defaults
await server.register(cors, {
  origin: process.env.NODE_ENV === 'development' ? true : [/\\.example\\.com$/],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

// Create MCP server
const mcpServer = new McpServer(
  {
    name: 'content-farm-mcp',
    version: '1.0.0',
    description: 'Content Farm MCP Server',
  },
  {
    // MCP server options
    requestTimeout: 30000, // 30 seconds
  },
);

// Create and connect Fastify transport
const transport = FastifyTransport.create(server, config.server.path);
await mcpServer.connect(transport);

// Set up error handling for the transport
transport.onclose = () => {
  server.log.warn('MCP transport connection closed');
};

// Register resources and tools
registerResources(mcpServer);
registerTools(mcpServer);

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close MCP server first
    server.log.info('Closing MCP server...');
    await mcpServer.close();
    
    // Then close Fastify server
    server.log.info('Closing HTTP server...');
    await server.close();
    
    server.log.info('Server stopped gracefully');
    process.exit(0);
  } catch (error) {
    server.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  server.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  server.log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
const start = async () => {
  try {
    const address = await server.listen({
      port: config.server.port,
      host: config.server.host,
    });
    server.log.info(`MCP server listening at ${address}`);
  } catch (error) {
    server.log.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export async function createMcpServer() {
  // Create Fastify instance
  const app = fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    disableRequestLogging: process.env.NODE_ENV === 'production',
  });

  // Create MCP server
  const mcpServer = new McpServer({
    name: config.server.name,
    version: config.server.version,
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
    },
  });

  // Register MCP resources and tools
  try {
    const { registerResources } = await import('./resources');
    const { registerTools } = await import('./tools');
    
    await registerResources(mcpServer);
    await registerTools(mcpServer);
    app.log.info('MCP resources and tools registered');
  } catch (error) {
    app.log.error('Failed to register MCP resources and tools:', error);
    throw error;
  }

  // Set up Fastify transport
  const transport = new FastifyTransport({
    server: app,
    path: config.server.path || '/mcp',
  });

  // Connect MCP server to transport
  await mcpServer.connect(transport);

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    name: config.server.name,
    version: config.server.version
  }));

  // Start the server
  const start = async () => {
    try {
      await app.listen({
        port: config.server.port,
        host: config.server.host
      });
      console.log(`MCP Server running at http://${config.server.host}:${config.server.port}`);
    } catch (err) {
      console.error('Error starting MCP server:', err);
      process.exit(1);
    }
  };

  return {
    start,
    app,
    mcpServer
  };
}
