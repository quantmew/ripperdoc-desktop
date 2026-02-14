/**
 * Protocol helpers for JSON Control Protocol over stdio.
 */

import type {
  SDKControlRequest,
  SDKControlResponse,
  Message
} from '../types/index.js';

export type ControlRequest = SDKControlRequest;
export type ControlResponse = SDKControlResponse;

export function isControlRequest(data: unknown): data is ControlRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as ControlRequest).type === 'control_request' &&
    typeof (data as ControlRequest).request_id === 'string' &&
    typeof (data as ControlRequest).request === 'object'
  );
}

export function isControlResponse(data: unknown): data is ControlResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as ControlResponse).type === 'control_response' &&
    typeof (data as ControlResponse).response === 'object'
  );
}

export function isStreamMessage(data: unknown): data is Message {
  return (
    typeof data === 'object' &&
    data !== null &&
    ['user', 'assistant', 'system', 'result', 'stream_event'].includes((data as Message).type)
  );
}
