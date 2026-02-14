/**
 * Subprocess transport implementation using Ripperdoc Code CLI.
 */

import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import {
  CLIConnectionError,
  CLINotFoundError,
  ProcessError,
  CLIJSONDecodeError
} from '../errors/index.js';
import type { RipperdocAgentOptions } from '../types/index.js';
import type { Transport } from './transport.js';
import { __version__ } from '../version.js';

const DEFAULT_MAX_BUFFER_SIZE = 1024 * 1024;
const MINIMUM_RIPPERDOC_CODE_VERSION = '2.0.0';
const CMD_LENGTH_LIMIT = process.platform === 'win32' ? 8000 : 100000;

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function findOnPath(command: string): string | null {
  const envPath = process.env.PATH ?? '';
  const parts = envPath.split(process.platform === 'win32' ? ';' : ':');
  for (const base of parts) {
    const full = join(base, command);
    if (isFile(full)) {
      return full;
    }
  }
  return null;
}

function compareVersions(a: string, b: string): number {
  const ap = a.split('.').map((v) => Number.parseInt(v, 10));
  const bp = b.split('.').map((v) => Number.parseInt(v, 10));
  const length = Math.max(ap.length, bp.length);
  for (let i = 0; i < length; i += 1) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

function parseNumericId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const id = Number.parseInt(trimmed, 10);
  return Number.isFinite(id) ? id : null;
}

function resolveUserIds(user: string): { uid: number; gid?: number } | null {
  if (process.platform === 'win32') {
    return null;
  }

  const numeric = parseNumericId(user);
  if (numeric !== null) {
    return { uid: numeric };
  }

  try {
    const uidStr = execFileSync('id', ['-u', user], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const gidStr = execFileSync('id', ['-g', user], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const uid = parseNumericId(uidStr);
    const gid = parseNumericId(gidStr);
    if (uid === null) {
      return null;
    }
    const result: { uid: number; gid?: number } = { uid };
    if (gid !== null) {
      result.gid = gid;
    }
    return result;
  } catch {
    return null;
  }
}

export class StdioTransport implements Transport {
  private readonly prompt: string | AsyncIterable<Record<string, unknown>>;
  private readonly isStreaming: boolean;
  private readonly options: RipperdocAgentOptions;
  private readonly cliPath: string;
  private readonly cwd?: string;
  private readonly maxBufferSize: number;

  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private jsonBuffer = '';
  private ready = false;
  private exitError: Error | null = null;
  private tempFiles: string[] = [];
  private writeChain: Promise<void> = Promise.resolve();

  private stderrReading = false;

  constructor(prompt: string | AsyncIterable<Record<string, unknown>>, options: RipperdocAgentOptions) {
    this.prompt = prompt;
    this.isStreaming = typeof prompt !== 'string';
    this.options = options;
    this.cliPath = options.cli_path ?? this.findCli();
    this.cwd = options.cwd ?? undefined;
    this.maxBufferSize = options.max_buffer_size ?? DEFAULT_MAX_BUFFER_SIZE;
  }

  private findCli(): string {
    const bundled = this.findBundledCli();
    if (bundled) {
      return bundled;
    }

    const cliName = process.platform === 'win32' ? 'ripperdoc.exe' : 'ripperdoc';
    const found = findOnPath(cliName);
    if (found) {
      return found;
    }

    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const locations = [
      join(home, '.npm-global/bin/ripperdoc'),
      '/usr/local/bin/ripperdoc',
      join(home, '.local/bin/ripperdoc'),
      join(home, 'node_modules/.bin/ripperdoc'),
      join(home, '.yarn/bin/ripperdoc'),
      join(home, '.ripperdoc/local/ripperdoc')
    ];

    for (const path of locations) {
      if (isFile(path)) {
        return path;
      }
    }

    throw new CLINotFoundError(
      'Ripperdoc Code not found. Install with:\n' +
        '  npm install -g @ripperdoc-ai/ripperdoc-code\n' +
        '\nIf already installed locally, try:\n' +
        '  export PATH="$HOME/node_modules/.bin:$PATH"\n' +
        '\nOr provide the path via RipperdocAgentOptions:\n' +
        '  RipperdocAgentOptions(cli_path="/path/to/ripperdoc")'
    );
  }

  private findBundledCli(): string | null {
    const cliName = process.platform === 'win32' ? 'ripperdoc.exe' : 'ripperdoc';
    const bundledPath = resolve(__dirname, '..', '_bundled', cliName);
    if (isFile(bundledPath)) {
      return bundledPath;
    }
    return null;
  }

  private buildSettingsValue(): string | null {
    const hasSettings = this.options.settings !== undefined && this.options.settings !== null;
    const hasSandbox = this.options.sandbox !== undefined && this.options.sandbox !== null;

    if (!hasSettings && !hasSandbox) {
      return null;
    }

    if (hasSettings && !hasSandbox) {
      return this.options.settings ?? null;
    }

    let settingsObj: Record<string, unknown> = {};
    if (hasSettings && this.options.settings) {
      const settingsStr = this.options.settings.trim();
      if (settingsStr.startsWith('{') && settingsStr.endsWith('}')) {
        try {
          settingsObj = JSON.parse(settingsStr) as Record<string, unknown>;
        } catch {
          if (isFile(settingsStr)) {
            settingsObj = JSON.parse(readFileSync(settingsStr, 'utf8')) as Record<string, unknown>;
          }
        }
      } else if (isFile(settingsStr)) {
        settingsObj = JSON.parse(readFileSync(settingsStr, 'utf8')) as Record<string, unknown>;
      }
    }

    if (hasSandbox) {
      settingsObj.sandbox = this.options.sandbox;
    }

    return JSON.stringify(settingsObj);
  }

  private buildCommand(): string[] {
    const cmd: string[] = [this.cliPath, '--output-format', 'stream-json', '--verbose'];

    if (this.options.system_prompt === undefined || this.options.system_prompt === null) {
      cmd.push('--system-prompt', '');
    } else if (typeof this.options.system_prompt === 'string') {
      cmd.push('--system-prompt', this.options.system_prompt);
    } else if (this.options.system_prompt.type === 'preset' && this.options.system_prompt.append) {
      cmd.push('--append-system-prompt', this.options.system_prompt.append);
    }

    if (this.options.tools !== undefined && this.options.tools !== null) {
      if (Array.isArray(this.options.tools)) {
        if (this.options.tools.length === 0) {
          cmd.push('--tools', '');
        } else {
          cmd.push('--tools', this.options.tools.join(','));
        }
      } else {
        cmd.push('--tools', 'default');
      }
    }

    if (this.options.allowed_tools && this.options.allowed_tools.length > 0) {
      cmd.push('--allowedTools', this.options.allowed_tools.join(','));
    }

    if (this.options.max_turns) {
      cmd.push('--max-turns', String(this.options.max_turns));
    }

    if (this.options.max_budget_usd !== undefined && this.options.max_budget_usd !== null) {
      cmd.push('--max-budget-usd', String(this.options.max_budget_usd));
    }

    if (this.options.disallowed_tools && this.options.disallowed_tools.length > 0) {
      cmd.push('--disallowedTools', this.options.disallowed_tools.join(','));
    }

    if (this.options.model) {
      cmd.push('--model', this.options.model);
    }

    if (this.options.fallback_model) {
      cmd.push('--fallback-model', this.options.fallback_model);
    }

    if (this.options.betas && this.options.betas.length > 0) {
      cmd.push('--betas', this.options.betas.join(','));
    }

    if (this.options.permission_prompt_tool_name) {
      cmd.push('--permission-prompt-tool', this.options.permission_prompt_tool_name);
    }

    if (this.options.permission_mode) {
      cmd.push('--permission-mode', this.options.permission_mode);
    }

    if (this.options.continue_conversation) {
      cmd.push('--continue');
    }

    if (this.options.resume) {
      cmd.push('--resume', this.options.resume);
    }

    const settingsValue = this.buildSettingsValue();
    if (settingsValue) {
      cmd.push('--settings', settingsValue);
    }

    if (this.options.add_dirs && this.options.add_dirs.length > 0) {
      for (const dir of this.options.add_dirs) {
        cmd.push('--add-dir', String(dir));
      }
    }

    if (this.options.mcp_servers) {
      if (typeof this.options.mcp_servers === 'object' && !Array.isArray(this.options.mcp_servers)) {
        const serversForCli: Record<string, unknown> = {};
        for (const [name, config] of Object.entries(this.options.mcp_servers)) {
          if (config && typeof config === 'object' && (config as { type?: string }).type === 'sdk') {
            const cloned = { ...(config as Record<string, unknown>) };
            delete (cloned as { instance?: unknown }).instance;
            serversForCli[name] = cloned;
          } else {
            serversForCli[name] = config as unknown;
          }
        }
        if (Object.keys(serversForCli).length > 0) {
          cmd.push('--mcp-config', JSON.stringify({ mcpServers: serversForCli }));
        }
      } else {
        cmd.push('--mcp-config', String(this.options.mcp_servers));
      }
    }

    if (this.options.include_partial_messages) {
      cmd.push('--include-partial-messages');
    }

    if (this.options.fork_session) {
      cmd.push('--fork-session');
    }

    if (this.options.agents) {
      const agentsDict: Record<string, unknown> = {};
      for (const [name, agentDef] of Object.entries(this.options.agents)) {
        const entry: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(agentDef)) {
          if (value !== undefined && value !== null) {
            entry[key] = value;
          }
        }
        agentsDict[name] = entry;
      }
      const agentsJson = JSON.stringify(agentsDict);
      cmd.push('--agents', agentsJson);
    }

    const sourcesValue = this.options.setting_sources ? this.options.setting_sources.join(',') : '';
    cmd.push('--setting-sources', sourcesValue);

    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        if (plugin.type === 'local') {
          cmd.push('--plugin-dir', plugin.path);
        } else {
          throw new Error(`Unsupported plugin type: ${plugin.type}`);
        }
      }
    }

    if (this.options.extra_args) {
      for (const [flag, value] of Object.entries(this.options.extra_args)) {
        if (value === null) {
          cmd.push(`--${flag}`);
        } else {
          cmd.push(`--${flag}`, String(value));
        }
      }
    }

    if (this.options.max_thinking_tokens !== undefined && this.options.max_thinking_tokens !== null) {
      cmd.push('--max-thinking-tokens', String(this.options.max_thinking_tokens));
    }

    if (
      this.options.output_format &&
      typeof this.options.output_format === 'object' &&
      (this.options.output_format as { type?: string }).type === 'json_schema'
    ) {
      const schema = (this.options.output_format as { schema?: unknown }).schema;
      if (schema) {
        cmd.push('--json-schema', JSON.stringify(schema));
      }
    }

    if (this.isStreaming) {
      cmd.push('--input-format', 'stream-json');
    } else {
      cmd.push('--print', '--', String(this.prompt));
    }

    const cmdStr = cmd.join(' ');
    if (cmdStr.length > CMD_LENGTH_LIMIT && this.options.agents) {
      try {
        const agentsIdx = cmd.indexOf('--agents');
        if (agentsIdx >= 0 && cmd[agentsIdx + 1]) {
          const tempFile = join(tmpdir(), `ripperdoc-agents-${randomUUID()}.json`);
          const value = cmd[agentsIdx + 1];
          writeFileSync(tempFile, value, 'utf8');
          this.tempFiles.push(tempFile);
          cmd[agentsIdx + 1] = `@${tempFile}`;
        }
      } catch {
        // ignore
      }
    }

    return cmd;
  }

  private async checkRipperdocVersion(): Promise<void> {
    let versionOutput = '';
    try {
      const versionProcess = spawn(this.cliPath, ['-v'], { stdio: ['ignore', 'pipe', 'pipe'] });
      versionProcess.stdout.on('data', (chunk) => {
        versionOutput += String(chunk);
      });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 2000);

        versionProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      const match = versionOutput.trim().match(/([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match) {
        const version = match[1];
        if (compareVersions(version, MINIMUM_RIPPERDOC_CODE_VERSION) < 0) {
          const warning =
            `Warning: Ripperdoc Code version ${version} is unsupported in the Agent SDK. ` +
            `Minimum required version is ${MINIMUM_RIPPERDOC_CODE_VERSION}. ` +
            'Some features may not work correctly.';
          // eslint-disable-next-line no-console
          console.warn(warning);
        }
      }
    } catch {
      // ignore
    }
  }

  async connect(): Promise<void> {
    if (this.process) {
      return;
    }

    if (!process.env.RIPPERDOC_AGENT_SDK_SKIP_VERSION_CHECK) {
      await this.checkRipperdocVersion();
    }

    if (this.cwd && !existsSync(this.cwd)) {
      const error = new CLIConnectionError(`Working directory does not exist: ${this.cwd}`);
      this.exitError = error;
      throw error;
    }

    const cmd = this.buildCommand();

    try {
      const env = {
        ...process.env,
        ...(this.options.env ?? {}),
        RIPPERDOC_CODE_ENTRYPOINT: 'sdk-ts',
        RIPPERDOC_AGENT_SDK_VERSION: __version__
      } as Record<string, string>;

      if (this.options.enable_file_checkpointing) {
        env.RIPPERDOC_CODE_ENABLE_SDK_FILE_CHECKPOINTING = 'true';
      }

      if (this.cwd) {
        env.PWD = this.cwd;
      }

      const shouldPipeStderr =
        (this.options.stderr !== undefined && this.options.stderr !== null) ||
        (this.options.extra_args && Object.prototype.hasOwnProperty.call(this.options.extra_args, 'debug-to-stderr'));

      const stderrSetting: 'pipe' | 'inherit' = shouldPipeStderr ? 'pipe' : 'inherit';

      const spawnOptions: {
        env: Record<string, string>;
        cwd?: string;
        stdio: ['pipe', 'pipe', 'pipe' | 'inherit'];
        shell: false;
        uid?: number;
        gid?: number;
      } = {
        env,
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', stderrSetting],
        shell: false
      };

      if (this.options.user) {
        const ids = resolveUserIds(this.options.user);
        if (!ids) {
          throw new CLIConnectionError(
            process.platform === 'win32'
              ? 'user option is not supported on Windows'
              : `Failed to resolve user: ${this.options.user}`
          );
        }
        spawnOptions.uid = ids.uid;
        if (ids.gid !== undefined) {
          spawnOptions.gid = ids.gid;
        }
      }

      this.process = spawn(cmd[0], cmd.slice(1), spawnOptions);

      if (!this.process.stdout || !this.process.stdin) {
        throw new CLIConnectionError('Failed to create stdio pipes');
      }

      this.process.stdout.setEncoding('utf8');
      this.process.stdout.on('data', (chunk: string) => {
        this.buffer += chunk;
        this.processBuffer();
      });

      this.process.stdout.on('error', (error) => {
        this.exitError = error;
      });

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const onError = (error: Error) => {
          if (settled) {
            return;
          }
          settled = true;
          this.cleanup();
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            reject(new CLINotFoundError('Ripperdoc Code not found', this.cliPath));
            return;
          }
          reject(new CLIConnectionError(`Failed to spawn process: ${error.message}`));
        };

        this.process?.once('error', onError);

        setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          this.process?.off('error', onError);
          resolve();
        }, 100);
      });

      this.process.on('exit', (code) => {
        if (code !== null && code !== 0) {
          this.exitError = new ProcessError(`Command failed with exit code ${code}`, code, 'Check stderr output for details');
        }
        this.cleanup();
        this.messageQueue.close();
      });

      if (this.process.stderr && shouldPipeStderr && !this.stderrReading) {
        this.stderrReading = true;
        this.process.stderr.setEncoding('utf8');
        let stderrBuffer = '';
        this.process.stderr.on('data', (chunk: string) => {
          stderrBuffer += chunk;
          let idx;
          while ((idx = stderrBuffer.indexOf('\n')) >= 0) {
            const line = stderrBuffer.slice(0, idx).replace(/\r$/, '');
            stderrBuffer = stderrBuffer.slice(idx + 1);
            if (line.length === 0) {
              continue;
            }
            if (this.options.stderr) {
              this.options.stderr(line);
            } else if (this.options.extra_args && Object.prototype.hasOwnProperty.call(this.options.extra_args, 'debug-to-stderr')) {
              const debugStderr =
                this.options.debug_stderr === undefined ? process.stderr : this.options.debug_stderr;
              if (debugStderr && typeof (debugStderr as { write?: (chunk: string) => void }).write === 'function') {
                (debugStderr as { write: (chunk: string) => void; flush?: () => void }).write(`${line}\n`);
                if (typeof (debugStderr as { flush?: () => void }).flush === 'function') {
                  (debugStderr as { flush: () => void }).flush();
                }
              }
            }
          }
        });
      }

      if (!this.isStreaming && this.process.stdin) {
        this.process.stdin.end();
      }

      this.ready = true;
    } catch (error) {
      this.cleanup();
      if (error instanceof CLINotFoundError || error instanceof CLIConnectionError) {
        throw error;
      }
      throw new CLIConnectionError(`Failed to start Ripperdoc Code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private processBuffer(): void {
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf('\n');

      if (!line) {
        continue;
      }

      this.jsonBuffer += line;
      if (this.jsonBuffer.length > this.maxBufferSize) {
        const length = this.jsonBuffer.length;
        const snapshot = this.jsonBuffer;
        this.jsonBuffer = '';
        this.exitError = new CLIJSONDecodeError(
          snapshot,
          new Error(`Buffer size ${length} exceeds limit ${this.maxBufferSize}`)
        );
        continue;
      }

      try {
        const data = JSON.parse(this.jsonBuffer) as Record<string, unknown>;
        this.jsonBuffer = '';
        this.messageQueue.push(data);
      } catch {
        // Wait for more data to complete JSON
      }
    }
  }

  private messageQueue = new (class {
    private items: Array<Record<string, unknown>> = [];
    private waiters: Array<(value: IteratorResult<Record<string, unknown>>) => void> = [];
    private done = false;

    push(item: Record<string, unknown>): void {
      if (this.done) {
        return;
      }
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter({ value: item, done: false });
        return;
      }
      this.items.push(item);
    }

    close(): void {
      this.done = true;
      while (this.waiters.length > 0) {
        const waiter = this.waiters.shift();
        if (waiter) {
          waiter({ value: undefined as never, done: true });
        }
      }
    }

    async next(): Promise<IteratorResult<Record<string, unknown>>> {
      if (this.items.length > 0) {
        return { value: this.items.shift() as Record<string, unknown>, done: false };
      }
      if (this.done) {
        return { value: undefined as never, done: true };
      }
      return new Promise((resolve) => {
        this.waiters.push(resolve);
      });
    }
  })();

  async *readMessages(): AsyncGenerator<Record<string, unknown>, void, unknown> {
    if (!this.process || !this.process.stdout) {
      throw new CLIConnectionError('Not connected');
    }

    try {
      while (true) {
        const result = await this.messageQueue.next();
        if (result.done) {
          break;
        }
        yield result.value;
      }
    } finally {
      if (this.exitError) {
        throw this.exitError;
      }
    }
  }

  async write(data: string): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      if (!this.ready || !this.process || !this.process.stdin) {
        throw new CLIConnectionError('ProcessTransport is not ready for writing');
      }
      if (this.process.exitCode !== null) {
        throw new CLIConnectionError(`Cannot write to terminated process (exit code: ${this.process.exitCode})`);
      }
      if (this.exitError) {
        throw new CLIConnectionError(`Cannot write to process that exited with error: ${this.exitError.message}`);
      }
      await new Promise<void>((resolve, reject) => {
        this.process!.stdin.write(data, 'utf8', (error) => {
          if (error) {
            reject(new CLIConnectionError(`Failed to write to process stdin: ${error.message}`));
          } else {
            resolve();
          }
        });
      });
    });
    return this.writeChain;
  }

  async endInput(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      if (this.process?.stdin) {
        await new Promise<void>((resolve) => {
          this.process?.stdin.end(() => resolve());
        });
      }
    });
    return this.writeChain;
  }

  async close(): Promise<void> {
    for (const tempFile of this.tempFiles) {
      try {
        unlinkSync(tempFile);
      } catch {
        // ignore
      }
    }
    this.tempFiles = [];

    if (!this.process) {
      this.ready = false;
      this.messageQueue.close();
      return;
    }

    this.ready = false;

    if (this.process.stdin) {
      this.process.stdin.destroy();
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1000);
      this.process?.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      this.process?.kill();
    });

    this.cleanup();
    this.messageQueue.close();
  }

  isReady(): boolean {
    return this.ready;
  }

  private cleanup(): void {
    this.ready = false;
    this.buffer = '';
    this.jsonBuffer = '';
    this.process = null;
  }
}
