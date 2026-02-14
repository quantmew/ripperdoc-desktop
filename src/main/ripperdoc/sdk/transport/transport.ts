/**
 * Transport interface for Ripperdoc SDK.
 */

export interface Transport {
  connect(): Promise<void>;
  write(data: string): Promise<void>;
  readMessages(): AsyncIterable<Record<string, unknown>>;
  close(): Promise<void>;
  isReady(): boolean;
  endInput(): Promise<void>;
}
