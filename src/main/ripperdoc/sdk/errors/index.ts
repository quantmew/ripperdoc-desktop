/**
 * Error types for the Ripperdoc SDK (TypeScript)
 * Ported from the Python SDK.
 */

export class RipperdocSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RipperdocSDKError';
    Object.setPrototypeOf(this, RipperdocSDKError.prototype);
  }
}

export class CLIConnectionError extends RipperdocSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'CLIConnectionError';
    Object.setPrototypeOf(this, CLIConnectionError.prototype);
  }
}

export class CLINotFoundError extends CLIConnectionError {
  constructor(message = 'Ripperdoc Code not found', cliPath?: string) {
    const fullMessage = cliPath ? `${message}: ${cliPath}` : message;
    super(fullMessage);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

export class ProcessError extends RipperdocSDKError {
  public readonly exitCode: number | null;
  public readonly stderr: string | null;

  constructor(message: string, exitCode?: number | null, stderr?: string | null) {
    const parts: string[] = [message];
    if (exitCode !== undefined && exitCode !== null) {
      parts.push(`(exit code: ${exitCode})`);
    }
    if (stderr) {
      parts.push(`Error output: ${stderr}`);
    }
    super(parts.join('\n'));
    this.name = 'ProcessError';
    this.exitCode = exitCode ?? null;
    this.stderr = stderr ?? null;
    Object.setPrototypeOf(this, ProcessError.prototype);
  }
}

export class CLIJSONDecodeError extends RipperdocSDKError {
  public readonly line: string;
  public readonly originalError: Error;

  constructor(line: string, originalError: Error) {
    super(`Failed to decode JSON: ${line.slice(0, 100)}...`);
    this.name = 'CLIJSONDecodeError';
    this.line = line;
    this.originalError = originalError;
    Object.setPrototypeOf(this, CLIJSONDecodeError.prototype);
  }
}

export class MessageParseError extends RipperdocSDKError {
  public readonly data?: Record<string, unknown>;

  constructor(message: string, data?: Record<string, unknown>) {
    super(message);
    this.name = 'MessageParseError';
    this.data = data;
    Object.setPrototypeOf(this, MessageParseError.prototype);
  }
}
