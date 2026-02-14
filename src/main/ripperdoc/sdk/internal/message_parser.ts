/**
 * Message parser for Ripperdoc Code SDK responses.
 */

import {
  type AssistantMessage,
  type ContentBlock,
  type Message,
  type ResultMessage,
  type StreamEvent,
  type SystemMessage,
  type UserMessage
} from '../types/index.js';
import { MessageParseError } from '../errors/index.js';

export function parseMessage(data: Record<string, unknown>): Message {
  if (typeof data !== 'object' || data === null) {
    throw new MessageParseError(`Invalid message data type (expected object, got ${typeof data})`);
  }

  const messageType = data.type;
  if (typeof messageType !== 'string' || messageType.length === 0) {
    throw new MessageParseError("Message missing 'type' field", data as Record<string, unknown>);
  }

  switch (messageType) {
    case 'user': {
      try {
        const parentToolUseId = data.parent_tool_use_id as string | null | undefined;
        const toolUseResult = data.tool_use_result as Record<string, unknown> | null | undefined;
        const uuid = data.uuid as string | null | undefined;
        const message = data.message as { content?: unknown } | undefined;
        const rawContent = message?.content;

        if (Array.isArray(rawContent)) {
          const blocks: ContentBlock[] = [];
          for (const block of rawContent) {
            if (!block || typeof block !== 'object') {
              continue;
            }
            const blockType = (block as { type?: string }).type;
            if (blockType === 'text') {
              blocks.push({ type: 'text', text: (block as { text: string }).text });
            } else if (blockType === 'tool_use') {
              blocks.push({
                type: 'tool_use',
                id: (block as { id: string }).id,
                name: (block as { name: string }).name,
                input: (block as { input: Record<string, unknown> }).input
              });
            } else if (blockType === 'tool_result') {
              blocks.push({
                type: 'tool_result',
                tool_use_id: (block as { tool_use_id: string }).tool_use_id,
                content: (block as { content?: string | Array<Record<string, unknown>> | null }).content,
                is_error: (block as { is_error?: boolean | null }).is_error
              });
            }
          }

          const userMessage: UserMessage = {
            type: 'user',
            content: blocks,
            uuid,
            parent_tool_use_id: parentToolUseId,
            tool_use_result: toolUseResult
          };

          return userMessage;
        }

        const userMessage: UserMessage = {
          type: 'user',
          content: rawContent as string,
          uuid,
          parent_tool_use_id: parentToolUseId,
          tool_use_result: toolUseResult
        };

        return userMessage;
      } catch (error) {
        throw new MessageParseError(`Missing required field in user message: ${String(error)}`, data);
      }
    }

    case 'assistant': {
      try {
        const message = data.message as { content?: unknown; model?: string; error?: string } | undefined;
        const rawContent = message?.content as Array<Record<string, unknown>> | undefined;
        const blocks: ContentBlock[] = [];
        if (Array.isArray(rawContent)) {
          for (const block of rawContent) {
            const blockType = block.type as string | undefined;
            if (blockType === 'text') {
              blocks.push({ type: 'text', text: block.text as string });
            } else if (blockType === 'thinking') {
              blocks.push({
                type: 'thinking',
                thinking: block.thinking as string,
                signature: block.signature as string
              });
            } else if (blockType === 'tool_use') {
              blocks.push({
                type: 'tool_use',
                id: block.id as string,
                name: block.name as string,
                input: block.input as Record<string, unknown>
              });
            } else if (blockType === 'tool_result') {
              blocks.push({
                type: 'tool_result',
                tool_use_id: block.tool_use_id as string,
                content: block.content as string | Array<Record<string, unknown>> | null | undefined,
                is_error: block.is_error as boolean | null | undefined
              });
            }
          }
        }

        const assistantMessage: AssistantMessage = {
          type: 'assistant',
          content: blocks,
          model: String(message?.model ?? ''),
          parent_tool_use_id: (data.parent_tool_use_id as string | null | undefined) ?? null,
          error: (message?.error as AssistantMessage['error']) ?? null
        };

        return assistantMessage;
      } catch (error) {
        throw new MessageParseError(`Missing required field in assistant message: ${String(error)}`, data);
      }
    }

    case 'system': {
      try {
        const systemMessage: SystemMessage = {
          type: 'system',
          subtype: String(data.subtype ?? ''),
          data: data as Record<string, unknown>
        };
        return systemMessage;
      } catch (error) {
        throw new MessageParseError(`Missing required field in system message: ${String(error)}`, data);
      }
    }

    case 'result': {
      try {
        const resultMessage: ResultMessage = {
          type: 'result',
          subtype: String(data.subtype ?? ''),
          duration_ms: Number(data.duration_ms ?? 0),
          duration_api_ms: Number(data.duration_api_ms ?? 0),
          is_error: Boolean(data.is_error),
          num_turns: Number(data.num_turns ?? 0),
          session_id: String(data.session_id ?? ''),
          total_cost_usd: (data.total_cost_usd as number | null | undefined) ?? null,
          usage: (data.usage as Record<string, unknown> | null | undefined) ?? null,
          result: (data.result as string | null | undefined) ?? null,
          structured_output: data.structured_output as unknown
        };
        return resultMessage;
      } catch (error) {
        throw new MessageParseError(`Missing required field in result message: ${String(error)}`, data);
      }
    }

    case 'stream_event': {
      try {
        const streamEvent: StreamEvent = {
          type: 'stream_event',
          uuid: String(data.uuid ?? ''),
          session_id: String(data.session_id ?? ''),
          event: (data.event as Record<string, unknown>) ?? {},
          parent_tool_use_id: (data.parent_tool_use_id as string | null | undefined) ?? null
        };
        return streamEvent;
      } catch (error) {
        throw new MessageParseError(`Missing required field in stream_event message: ${String(error)}`, data);
      }
    }

    default:
      throw new MessageParseError(`Unknown message type: ${messageType}`, data);
  }
}
