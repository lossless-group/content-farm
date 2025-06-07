import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types';
import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport';

// Default request timeout in milliseconds
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

export class FastifyTransport implements Transport {
  private readonly server: FastifyInstance;
  private readonly requestMap = new Map<RequestId, PendingRequest>();pn
  private readonly basePath: string;
  private messageHandler: ((message: JSONRPCMessage) => Promise<void>) | null = null;
  private isConnected = false;
  private readonly requestTimeout: number;

  constructor(server: FastifyInstance, basePath: string = '/mcp', requestTimeout: number = DEFAULT_REQUEST_TIMEOUT) {
    this.server = server;
    this.basePath = basePath;
    this.requestTimeout = requestTimeout;
  }

  async start(): Promise<void> {
    if (this.isConnected) {
      throw new Error('FastifyTransport is already started');
    }

    // Setup the HTTP endpoint for MCP requests
    this.server.post(this.basePath, async (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.messageHandler) {
        return reply.status(500).send({ 
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Message handler not set' },
          id: null
        });
      }

      try {
        const message = request.body as JSONRPCMessage;
        await this.messageHandler(message);
        return reply.status(200).send({ jsonrpc: '2.0', result: null });
      } catch (error) {
        console.error('Error handling MCP message:', error);
        return reply.status(500).send({
          jsonrpc: '2.0',
          error: { 
            code: -32603, 
            message: 'Internal server error',
            data: error instanceof Error ? error.message : String(error)
          },
          id: null
        });
      }
    });

    this.isConnected = true;
  }

  async send(message: JSONRPCMessage, options: TransportSendOptions = {}): Promise<void> {
    if (!this.isConnected) {
      throw new Error('FastifyTransport is not connected');
    }

    // Handle different types of messages (requests, responses, notifications)
    if ('method' in message) {
      // This is a request or notification
      const requestId = options.relatedRequestId;
      if (requestId !== undefined) {
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.requestMap.delete(requestId);
            reject(new Error(`Request ${requestId} timed out after ${this.requestTimeout}ms`));
          }, this.requestTimeout);

          this.requestMap.set(requestId, {
            resolve: () => {
              clearTimeout(timeout);
              resolve();
            },
            reject: (error: Error) => {
              clearTimeout(timeout);
              reject(error);
            },
            timeout
          });
        });
      }
    } else if (message.id !== undefined && ('result' in message || 'error' in message)) {
      // This is a response to a previous request
      const pendingRequest = this.requestMap.get(message.id);
      
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        
        if ('result' in message) {
          pendingRequest.resolve(message.result);
        } else if (message.error) {
          pendingRequest.reject(new Error(message.error.message || 'Unknown error'));
        }
        
        this.requestMap.delete(message.id);
      }
    }
    
    // Handle resumption token if provided
    if (options.onresumptiontoken && options.resumptionToken) {
      options.onresumptiontoken(options.resumptionToken);
    }
  }

  async close(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    // Reject all pending requests
    for (const [id, { reject, timeout }] of this.requestMap.entries()) {
      clearTimeout(timeout);
      // Ensure id is properly typed as RequestId
      const requestId: RequestId = id ?? null;
      reject(new Error(`Request ${String(requestId)} was cancelled due to transport closure`));
    }
    this.requestMap.clear();
    
    this.isConnected = false;
    
    // Notify about the connection close
    if (this.onclose) {
      this.onclose();
    }
  }

  onclose?: () => void;
  onmessage?: (message: JSONRPCMessage) => Promise<void>;

  setMessageHandler(handler: (message: JSONRPCMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Helper method to create a properly typed FastifyTransport instance
   */
  static create(server: FastifyInstance, basePath: string = '/mcp', requestTimeout: number = DEFAULT_REQUEST_TIMEOUT): FastifyTransport {
    return new FastifyTransport(server, basePath, requestTimeout);
  }
}

export function createFastifyTransport(server: FastifyInstance, basePath: string = '/mcp'): FastifyTransport {
  return new FastifyTransport(server, basePath);
}
