/**
 * Query class for handling bidirectional control protocol.
 */

import { randomBytes } from 'crypto';
import {
  type CanUseTool,
  type HookMatcher,
  type HookCallback,
  type PermissionResultAllow,
  type PermissionResultDeny,
  type PermissionUpdate,
  type SDKControlRequest,
  type SDKControlResponse,
  type SDKControlPermissionRequest,
  type SDKHookCallbackRequest,
  type SDKControlMcpMessageRequest,
  type PermissionResult,
  type ToolPermissionContext
} from '../types/index.js';
import { type Transport } from '../transport/transport.js';

interface QueueItem {
  type: 'message' | 'error' | 'end';
  value?: Record<string, unknown>;
  error?: Error;
}

class AsyncQueue {
  private items: QueueItem[] = [];
  private waiters: Array<(item: QueueItem) => void> = [];
  private closed = false;

  push(item: QueueItem): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(item);
      return;
    }
    this.items.push(item);
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter({ type: 'end' });
      }
    }
  }

  async next(): Promise<QueueItem> {
    if (this.items.length > 0) {
      return this.items.shift() as QueueItem;
    }

    if (this.closed) {
      return { type: 'end' };
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
}

interface PendingControl {
  resolve: (data: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

function convertHookOutputForCli(hookOutput: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(hookOutput)) {
    if (key === 'async_') {
      converted.async = value;
    } else if (key === 'continue_') {
      converted.continue = value;
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

function serializePermissionUpdate(update: PermissionUpdate): Record<string, unknown> {
  const result: Record<string, unknown> = { type: update.type };

  if (update.destination !== undefined && update.destination !== null) {
    result.destination = update.destination;
  }

  if (update.type === 'addRules' || update.type === 'replaceRules' || update.type === 'removeRules') {
    if (update.rules) {
      result.rules = update.rules.map((rule) => ({
        toolName: rule.tool_name,
        ruleContent: rule.rule_content ?? null
      }));
    }
    if (update.behavior) {
      result.behavior = update.behavior;
    }
  } else if (update.type === 'setMode') {
    if (update.mode) {
      result.mode = update.mode;
    }
  } else if (update.type === 'addDirectories' || update.type === 'removeDirectories') {
    if (update.directories) {
      result.directories = update.directories;
    }
  }

  return result;
}

export class Query {
  private readonly transport: Transport;
  private readonly isStreamingMode: boolean;
  private readonly canUseTool: CanUseTool | null;
  private readonly hooks: Record<string, HookMatcher[]>;
  private readonly sdkMcpServers: Record<string, unknown>;
  private readonly initializeTimeout: number;

  private pendingControlResponses: Map<string, PendingControl> = new Map();
  private hookCallbacks: Map<string, HookCallback> = new Map();
  private nextCallbackId = 0;
  private requestCounter = 0;

  private messageQueue = new AsyncQueue();
  private readLoopPromise: Promise<void> | null = null;
  private initialized = false;
  private closed = false;
  private initializationResult: Record<string, unknown> | null = null;

  private firstResultResolve: (() => void) | null = null;
  private firstResultPromise: Promise<void>;
  private streamCloseTimeoutMs: number;

  constructor(options: {
    transport: Transport;
    isStreamingMode: boolean;
    canUseTool?: CanUseTool | null;
    hooks?: Record<string, HookMatcher[]> | null;
    sdkMcpServers?: Record<string, unknown> | null;
    initializeTimeout?: number;
  }) {
    this.transport = options.transport;
    this.isStreamingMode = options.isStreamingMode;
    this.canUseTool = options.canUseTool ?? null;
    this.hooks = options.hooks ?? {};
    this.sdkMcpServers = options.sdkMcpServers ?? {};
    this.initializeTimeout = options.initializeTimeout ?? 60;

    this.firstResultPromise = new Promise((resolve) => {
      this.firstResultResolve = resolve;
    });

    const timeoutMs = Number(process.env.RIPPERDOC_CODE_STREAM_CLOSE_TIMEOUT ?? '60000');
    this.streamCloseTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : 60000;
  }

  async initialize(): Promise<Record<string, unknown> | null> {
    if (!this.isStreamingMode) {
      return null;
    }

    const hooksConfig: Record<string, unknown> = {};
    if (this.hooks) {
      for (const [event, matchers] of Object.entries(this.hooks)) {
        if (!matchers || matchers.length === 0) {
          continue;
        }
        const matcherConfigs: Array<Record<string, unknown>> = [];
        for (const matcher of matchers) {
          const callbackIds: string[] = [];
          for (const callback of matcher.hooks ?? []) {
            const callbackId = `hook_${this.nextCallbackId++}`;
            this.hookCallbacks.set(callbackId, callback);
            callbackIds.push(callbackId);
          }
          const matcherConfig: Record<string, unknown> = {
            matcher: matcher.matcher ?? null,
            hookCallbackIds: callbackIds
          };
          if (matcher.timeout !== undefined && matcher.timeout !== null) {
            matcherConfig.timeout = matcher.timeout;
          }
          matcherConfigs.push(matcherConfig);
        }
        hooksConfig[event] = matcherConfigs;
      }
    }

    const request = {
      subtype: 'initialize',
      hooks: Object.keys(hooksConfig).length > 0 ? hooksConfig : null
    };

    const response = await this.sendControlRequest(request, this.initializeTimeout);
    this.initialized = true;
    this.initializationResult = response;
    return response;
  }

  async start(): Promise<void> {
    if (this.readLoopPromise) {
      return;
    }
    this.readLoopPromise = this.readMessagesLoop();
  }

  private async readMessagesLoop(): Promise<void> {
    try {
      for await (const message of this.transport.readMessages()) {
        if (this.closed) {
          break;
        }

        const messageType = (message as { type?: string }).type;
        if (messageType === 'control_response') {
          this.handleControlResponse(message as SDKControlResponse);
          continue;
        }

        if (messageType === 'control_request') {
          void this.handleControlRequest(message as SDKControlRequest);
          continue;
        }

        if (messageType === 'control_cancel_request') {
          continue;
        }

        if (messageType === 'result' && this.firstResultResolve) {
          this.firstResultResolve();
          this.firstResultResolve = null;
        }

        this.messageQueue.push({ type: 'message', value: message });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const [requestId, pending] of this.pendingControlResponses.entries()) {
        clearTimeout(pending.timeoutId);
        pending.reject(err);
        this.pendingControlResponses.delete(requestId);
      }
      this.messageQueue.push({ type: 'error', error: err });
    } finally {
      this.messageQueue.push({ type: 'end' });
      this.messageQueue.close();
    }
  }

  private handleControlResponse(response: SDKControlResponse): void {
    const responseData = response.response as { request_id?: string; subtype?: string; error?: string; response?: unknown };
    const requestId = responseData.request_id;
    if (!requestId) {
      return;
    }
    const pending = this.pendingControlResponses.get(requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingControlResponses.delete(requestId);

    if (responseData.subtype === 'error') {
      pending.reject(new Error(responseData.error ?? 'Unknown error'));
      return;
    }

    const payload = responseData.response;
    pending.resolve((payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : {});
  }

  private async handleControlRequest(request: SDKControlRequest): Promise<void> {
    const requestId = request.request_id;
    const requestData = request.request as { subtype?: string };
    const subtype = requestData.subtype;

    try {
      let responseData: Record<string, unknown> = {};

      if (subtype === 'can_use_tool') {
        const permissionRequest = requestData as SDKControlPermissionRequest;
        if (!this.canUseTool) {
          throw new Error('canUseTool callback is not provided');
        }

        const originalInput = permissionRequest.input;
        const context: ToolPermissionContext = {
          signal: null,
          suggestions: (permissionRequest.permission_suggestions as PermissionUpdate[]) ?? []
        };

        const response = await this.canUseTool(
          permissionRequest.tool_name,
          permissionRequest.input,
          context
        );

        const result = response as PermissionResult;
        if ((result as PermissionResultAllow).behavior === 'allow') {
          const allow = result as PermissionResultAllow;
          responseData = {
            behavior: 'allow',
            updatedInput: allow.updated_input ?? originalInput
          };
          if (allow.updated_permissions) {
            responseData.updatedPermissions = allow.updated_permissions.map(serializePermissionUpdate);
          }
        } else if ((result as PermissionResultDeny).behavior === 'deny') {
          const deny = result as PermissionResultDeny;
          responseData = {
            behavior: 'deny',
            message: deny.message ?? ''
          };
          if (deny.interrupt) {
            responseData.interrupt = deny.interrupt;
          }
        } else {
          throw new TypeError('Tool permission callback must return PermissionResult');
        }
      } else if (subtype === 'hook_callback') {
        const hookRequest = requestData as SDKHookCallbackRequest;
        const callback = this.hookCallbacks.get(hookRequest.callback_id);
        if (!callback) {
          throw new Error(`No hook callback found for ID: ${hookRequest.callback_id}`);
        }

        const hookOutput = await callback(
          hookRequest.input as any,
          hookRequest.tool_use_id ?? null,
          { signal: null }
        );
        responseData = convertHookOutputForCli(hookOutput as Record<string, unknown>);
      } else if (subtype === 'mcp_message') {
        const mcpRequest = requestData as SDKControlMcpMessageRequest;
        const serverName = mcpRequest.server_name;
        const mcpMessage = mcpRequest.message;
        if (!serverName || !mcpMessage) {
          throw new Error('Missing server_name or message for MCP request');
        }
        const mcpResponse = await this.handleSdkMcpRequest(serverName, mcpMessage);
        responseData = { mcp_response: mcpResponse };
      } else {
        throw new Error(`Unsupported control request subtype: ${subtype}`);
      }

      const successResponse: SDKControlResponse = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: requestId,
          response: responseData
        }
      };
      await this.transport.write(`${JSON.stringify(successResponse)}\n`);
    } catch (error) {
      const errorResponse: SDKControlResponse = {
        type: 'control_response',
        response: {
          subtype: 'error',
          request_id: requestId,
          error: error instanceof Error ? error.message : String(error)
        }
      };
      await this.transport.write(`${JSON.stringify(errorResponse)}\n`);
    }
  }

  private async handleSdkMcpRequest(serverName: string, message: Record<string, unknown>): Promise<Record<string, unknown>> {
    const server = this.sdkMcpServers[serverName];
    if (!server) {
      return {
        jsonrpc: '2.0',
        id: message.id as unknown,
        error: { code: -32601, message: `Server '${serverName}' not found` }
      };
    }

    const method = message.method as string | undefined;
    const params = (message.params as Record<string, unknown>) ?? {};

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: message.id as unknown,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: (server as { name?: string }).name ?? serverName,
              version: (server as { version?: string }).version ?? '1.0.0'
            }
          }
        };
      }

      if (method === 'tools/list') {
        if (typeof (server as { listTools?: () => Promise<unknown> }).listTools === 'function') {
          const result = await (server as { listTools: () => Promise<Array<Record<string, unknown>>> }).listTools();
          return {
            jsonrpc: '2.0',
            id: message.id as unknown,
            result: { tools: result }
          };
        }
      }

      if (method === 'tools/call') {
        if (typeof (server as { callTool?: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> }).callTool === 'function') {
          const name = params.name as string;
          const args = (params.arguments as Record<string, unknown>) ?? {};
          const result = await (server as { callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> }).callTool(name, args);
          return {
            jsonrpc: '2.0',
            id: message.id as unknown,
            result
          };
        }
      }

      if (method === 'notifications/initialized') {
        return { jsonrpc: '2.0', result: {} };
      }

      return {
        jsonrpc: '2.0',
        id: message.id as unknown,
        error: { code: -32601, message: `Method '${method}' not found` }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id as unknown,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async sendControlRequest(request: Record<string, unknown>, timeoutSeconds = 60): Promise<Record<string, unknown>> {
    if (!this.isStreamingMode) {
      throw new Error('Control requests require streaming mode');
    }

    this.requestCounter += 1;
    const requestId = `req_${this.requestCounter}_${randomBytes(4).toString('hex')}`;

    const controlRequest = {
      type: 'control_request',
      request_id: requestId,
      request
    };

    const responsePromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingControlResponses.delete(requestId);
        reject(new Error(`Control request timeout: ${String(request.subtype)}`));
      }, timeoutSeconds * 1000);

      this.pendingControlResponses.set(requestId, { resolve, reject, timeoutId });
    });

    await this.transport.write(`${JSON.stringify(controlRequest)}\n`);

    return responsePromise;
  }

  async interrupt(): Promise<void> {
    await this.sendControlRequest({ subtype: 'interrupt' });
  }

  async setPermissionMode(mode: string): Promise<void> {
    await this.sendControlRequest({ subtype: 'set_permission_mode', mode });
  }

  async setModel(model: string | null): Promise<void> {
    await this.sendControlRequest({ subtype: 'set_model', model });
  }

  async rewindFiles(userMessageId: string): Promise<void> {
    await this.sendControlRequest({ subtype: 'rewind_files', user_message_id: userMessageId });
  }

  async streamInput(stream: AsyncIterable<Record<string, unknown>>): Promise<void> {
    try {
      for await (const message of stream) {
        if (this.closed) {
          break;
        }
        await this.transport.write(`${JSON.stringify(message)}\n`);
      }

      const hasHooks = Object.keys(this.hooks).length > 0;
      if (Object.keys(this.sdkMcpServers).length > 0 || hasHooks) {
        await Promise.race([
          this.firstResultPromise,
          new Promise<void>((resolve) => setTimeout(resolve, this.streamCloseTimeoutMs))
        ]);
      }

      await this.transport.endInput();
    } catch {
      // Ignore streaming errors
    }
  }

  async *receiveMessages(): AsyncGenerator<Record<string, unknown>, void, unknown> {
    while (true) {
      const item = await this.messageQueue.next();
      if (item.type === 'end') {
        break;
      }
      if (item.type === 'error') {
        throw item.error ?? new Error('Unknown error');
      }
      if (item.value) {
        yield item.value;
      }
    }
  }

  get initializationInfo(): Record<string, unknown> | null {
    return this.initializationResult;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.transport.close();
    if (this.readLoopPromise) {
      await this.readLoopPromise;
    }
  }
}
