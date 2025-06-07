declare module '@modelcontextprotocol/sdk/server/mcp' {
  import { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types';
  import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
  import { Implementation } from '@modelcontextprotocol/sdk/types';
  import { RegisteredResource, RegisteredTool } from '@modelcontextprotocol/sdk/types';
  import { ReadResourceCallback } from '@modelcontextprotocol/sdk/types';

  export class McpServer {
    constructor(serverInfo: Implementation, options?: ServerOptions);
    connect(transport: Transport): Promise<void>;
    close(): Promise<void>;
    resource(name: string, uri: string, readCallback: ReadResourceCallback): RegisteredResource;
    tool(name: string, description: string, handler: Function): RegisteredTool;
    tool(name: string, schema: any, handler: Function): RegisteredTool;
  }

  export interface ServerOptions {
    // Add any server options here
  }
}

declare module '@modelcontextprotocol/sdk/shared/transport' {
  import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types';

  export interface TransportSendOptions {
    relatedRequestId?: string | number;
    resumptionToken?: string;
    onresumptiontoken?: (token: string) => void;
  }

  export interface Transport {
    start(): Promise<void>;
    send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
    close(): Promise<void>;
    onclose?: () => void;
    onmessage?: (message: JSONRPCMessage) => Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/types' {
  export interface Implementation {
    name: string;
    version: string;
    description?: string;
  }

  export interface RegisteredResource {
    // Add methods/properties as needed
  }

  export interface RegisteredTool {
    // Add methods/properties as needed
  }

  export interface ReadResourceCallback {
    (uri: string): Promise<{ uri: string; text: string }>;
  }

  export type RequestId = string | number | null;

  export interface JSONRPCRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id?: RequestId;
  }

  export interface JSONRPCResponse {
    jsonrpc: '2.0';
    result?: any;
    error?: JSONRPCError;
    id: RequestId;
  }

  export interface JSONRPCNotification {
    jsonrpc: '2.0';
    method: string;
    params?: any;
  }

  export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse | JSONRPCNotification;

  export interface JSONRPCError {
    code: number;
    message: string;
    data?: any;
  }
}
