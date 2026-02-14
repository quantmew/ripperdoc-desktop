/**
 * Internal client implementation for one-shot queries.
 */

import type { RipperdocAgentOptions, HookMatcher, HookEvent, Message } from '../types/index.js';
import { Query } from './query.js';
import { parseMessage } from './message_parser.js';
import type { Transport } from '../transport/transport.js';
import { StdioTransport } from '../transport/stdio.js';

function normalizeHooks(hooks?: Partial<Record<HookEvent, HookMatcher[]>> | null): Record<string, HookMatcher[]> {
  return (hooks ?? {}) as Record<string, HookMatcher[]>;
}

export class InternalClient {
  async *processQuery(params: {
    prompt: string | AsyncIterable<Record<string, unknown>>;
    options: RipperdocAgentOptions;
    transport?: Transport | null;
  }): AsyncGenerator<Message, void, unknown> {
    const { prompt, options: agentOptions, transport } = params;

    let configuredOptions = agentOptions;
    if (agentOptions.can_use_tool) {
      if (typeof prompt === 'string') {
        throw new Error(
          'can_use_tool callback requires streaming mode. Please provide prompt as an AsyncIterable instead of a string.'
        );
      }
      if (agentOptions.permission_prompt_tool_name) {
        throw new Error(
          'can_use_tool callback cannot be used with permission_prompt_tool_name. Please use one or the other.'
        );
      }
      configuredOptions = { ...agentOptions, permission_prompt_tool_name: 'stdio' };
    }

    const chosenTransport = transport ?? new StdioTransport(prompt, configuredOptions);

    await chosenTransport.connect();

    const sdkMcpServers: Record<string, unknown> = {};
    if (configuredOptions.mcp_servers && typeof configuredOptions.mcp_servers === 'object' && !Array.isArray(configuredOptions.mcp_servers)) {
      for (const [name, config] of Object.entries(configuredOptions.mcp_servers)) {
        if (config && typeof config === 'object' && (config as { type?: string }).type === 'sdk') {
          sdkMcpServers[name] = (config as { instance: unknown }).instance;
        }
      }
    }

    const isStreaming = typeof prompt !== 'string';
    const query = new Query({
      transport: chosenTransport,
      isStreamingMode: isStreaming,
      canUseTool: configuredOptions.can_use_tool ?? null,
      hooks: normalizeHooks(configuredOptions.hooks),
      sdkMcpServers
    });

    try {
      await query.start();

      if (isStreaming) {
        await query.initialize();
      }

      if (isStreaming) {
        void query.streamInput(prompt as AsyncIterable<Record<string, unknown>>);
      }

      for await (const data of query.receiveMessages()) {
        yield parseMessage(data as Record<string, unknown>);
      }
    } finally {
      await query.close();
    }
  }
}
