/**
 * Main Ripperdoc SDK Client (TypeScript)
 */

import type { RipperdocAgentOptions, HookEvent, HookMatcher, Message, ResultMessage } from '../types/index.js';
import { Query } from '../internal/query.js';
import { parseMessage } from '../internal/message_parser.js';
import type { Transport } from '../transport/transport.js';
import { StdioTransport } from '../transport/stdio.js';
import { InternalClient } from '../internal/client.js';
import { CLIConnectionError } from '../errors/index.js';

function normalizeHooks(hooks?: Partial<Record<HookEvent, HookMatcher[]>> | null): Record<string, HookMatcher[]> {
  return (hooks ?? {}) as Record<string, HookMatcher[]>;
}

export class RipperdocSDKClient {
  public readonly options: RipperdocAgentOptions;
  private readonly customTransport: Transport | null;
  private transport: Transport | null = null;
  private queryHandler: Query | null = null;

  constructor(options: RipperdocAgentOptions = {}, transport?: Transport | null) {
    this.options = options;
    this.customTransport = transport ?? null;
    process.env.RIPPERDOC_CODE_ENTRYPOINT = 'sdk-ts-client';
  }

  async connect(prompt?: string | AsyncIterable<Record<string, unknown>> | null): Promise<void> {
    const emptyStream = async function* () {
      return;
      // eslint-disable-next-line no-unreachable
      yield {} as Record<string, unknown>;
    };

    const actualPrompt = prompt ?? emptyStream();

    let configuredOptions = this.options;
    if (this.options.can_use_tool) {
      if (typeof prompt === 'string') {
        throw new Error(
          'can_use_tool callback requires streaming mode. Please provide prompt as an AsyncIterable instead of a string.'
        );
      }
      if (this.options.permission_prompt_tool_name) {
        throw new Error(
          'can_use_tool callback cannot be used with permission_prompt_tool_name. Please use one or the other.'
        );
      }
      configuredOptions = { ...this.options, permission_prompt_tool_name: 'stdio' };
    }

    if (this.customTransport) {
      this.transport = this.customTransport;
    } else {
      this.transport = new StdioTransport(actualPrompt, configuredOptions);
    }

    await this.transport.connect();

    const sdkMcpServers: Record<string, unknown> = {};
    if (this.options.mcp_servers && typeof this.options.mcp_servers === 'object' && !Array.isArray(this.options.mcp_servers)) {
      for (const [name, config] of Object.entries(this.options.mcp_servers)) {
        if (config && typeof config === 'object' && (config as { type?: string }).type === 'sdk') {
          sdkMcpServers[name] = (config as { instance: unknown }).instance;
        }
      }
    }

    const initializeTimeoutMs = Number(process.env.RIPPERDOC_CODE_STREAM_CLOSE_TIMEOUT ?? '60000');
    const initializeTimeout = Math.max((Number.isFinite(initializeTimeoutMs) ? initializeTimeoutMs : 60000) / 1000, 60);

    this.queryHandler = new Query({
      transport: this.transport,
      isStreamingMode: true,
      canUseTool: this.options.can_use_tool ?? null,
      hooks: normalizeHooks(this.options.hooks),
      sdkMcpServers,
      initializeTimeout
    });

    await this.queryHandler.start();
    await this.queryHandler.initialize();

    if (typeof actualPrompt !== 'string') {
      void this.queryHandler.streamInput(actualPrompt);
    }
  }

  async *receiveMessages(): AsyncGenerator<Message, void, unknown> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }

    for await (const data of this.queryHandler.receiveMessages()) {
      yield parseMessage(data as Record<string, unknown>);
    }
  }

  async query(prompt: string | AsyncIterable<Record<string, unknown>>, session_id = 'default'): Promise<void> {
    if (!this.queryHandler || !this.transport) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }

    if (typeof prompt === 'string') {
      const message = {
        type: 'user',
        message: { role: 'user', content: prompt },
        parent_tool_use_id: null,
        session_id
      };
      await this.transport.write(`${JSON.stringify(message)}\n`);
      return;
    }

    for await (const msg of prompt) {
      if (!('session_id' in msg)) {
        (msg as Record<string, unknown>).session_id = session_id;
      }
      await this.transport.write(`${JSON.stringify(msg)}\n`);
    }
  }

  async interrupt(): Promise<void> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }
    await this.queryHandler.interrupt();
  }

  async setPermissionMode(mode: string): Promise<void> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }
    await this.queryHandler.setPermissionMode(mode);
  }

  async setModel(model: string | null = null): Promise<void> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }
    await this.queryHandler.setModel(model);
  }

  async rewindFiles(userMessageId: string): Promise<void> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }
    await this.queryHandler.rewindFiles(userMessageId);
  }

  async getServerInfo(): Promise<Record<string, unknown> | null> {
    if (!this.queryHandler) {
      throw new CLIConnectionError('Not connected. Call connect() first.');
    }
    return this.queryHandler.initializationInfo;
  }

  async *receiveResponse(): AsyncGenerator<Message, void, unknown> {
    for await (const message of this.receiveMessages()) {
      yield message;
      if ((message as ResultMessage).type === 'result') {
        return;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.queryHandler) {
      await this.queryHandler.close();
      this.queryHandler = null;
    }
    this.transport = null;
  }

  async enter(): Promise<RipperdocSDKClient> {
    await this.connect();
    return this;
  }

  async exit(): Promise<void> {
    await this.disconnect();
  }
}

// ============================================================================
// Simple Query Function
// ============================================================================

type QueryParams = {
  prompt: string | AsyncIterable<Record<string, unknown>>;
  options?: RipperdocAgentOptions;
  transport?: Transport | null;
};

function isAsyncIterable(value: unknown): value is AsyncIterable<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

export async function* query(
  prompt: string | AsyncIterable<Record<string, unknown>>,
  options?: RipperdocAgentOptions,
  transport?: Transport | null
): AsyncGenerator<Message, void, unknown>;
export async function* query(params: QueryParams): AsyncGenerator<Message, void, unknown>;
export async function* query(
  promptOrParams: string | AsyncIterable<Record<string, unknown>> | QueryParams,
  options?: RipperdocAgentOptions,
  transport?: Transport | null
): AsyncGenerator<Message, void, unknown> {
  process.env.RIPPERDOC_CODE_ENTRYPOINT = 'sdk-ts';

  let prompt: string | AsyncIterable<Record<string, unknown>>;
  let agentOptions: RipperdocAgentOptions | undefined;
  let chosenTransport: Transport | null | undefined;

  if (typeof promptOrParams === 'string' || isAsyncIterable(promptOrParams)) {
    prompt = promptOrParams;
    agentOptions = options;
    chosenTransport = transport ?? null;
  } else {
    prompt = promptOrParams.prompt;
    agentOptions = promptOrParams.options;
    chosenTransport = promptOrParams.transport ?? null;
  }

  const client = new InternalClient();
  const opts = agentOptions ?? {};

  for await (const message of client.processQuery({ prompt, options: opts, transport: chosenTransport })) {
    yield message;
  }
}
