/**
 * Configuration constants and utilities
 */

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG = {
  // Transport
  RIPPERDOC_PATH: 'ripperdoc',
  STARTUP_TIMEOUT: 10000,
  READ_TIMEOUT: 30000,
  WRITE_TIMEOUT: 5000,

  // Client
  DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
  DEFAULT_PERMISSION_MODE: 'default' as const,
  DEFAULT_MAX_TURNS: 50,
  DEFAULT_MAX_THINKING_TOKENS: 20000,

  // Queue
  MESSAGE_QUEUE_SIZE: 100,
  STREAM_BUFFER_SIZE: 8192,

  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Session
  SESSION_TIMEOUT: 300000, // 5 minutes

  // Protocol
  CONTROL_REQUEST_TIMEOUT: 5000,
  QUERY_TIMEOUT: 300000, // 5 minutes
} as const;

// ============================================================================
// Available Models
// ============================================================================

export const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
] as const;

export const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo'
] as const;

export const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-coder'
] as const;

export const ALL_MODELS = [...ANTHROPIC_MODELS, ...OPENAI_MODELS, ...DEEPSEEK_MODELS] as const;

// ============================================================================
// Built-in Tools
// ============================================================================

export const BUILTIN_TOOLS = [
  'Bash',
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'LS',
  'LSP',
  'Task',
  'Todo',
  'MCP',
  'BackgroundShell'
] as const;

export const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep', 'LS', 'LSP'] as const;

export const DANGEROUS_TOOLS = ['Bash', 'Edit', 'Write', 'BackgroundShell'] as const;

// ============================================================================
// Permission Modes
// ============================================================================

export const PERMISSION_MODES = ['default', 'acceptEdits', 'bypassPermissions', 'plan'] as const;

export const PERMISSION_MODE_DESCRIPTIONS: Record<string, string> = {
  default: 'Prompt for dangerous operations (file edits, bash commands)',
  acceptEdits: 'Auto-accept file edits but prompt for other dangerous operations',
  bypassPermissions: 'Allow all operations without prompting',
  plan: 'Planning mode - no operations will be executed'
};

// ============================================================================
// Feature Flags
// ============================================================================

export const SERVER_FEATURES = [
  'stdio',
  'mcp',
  'subagents',
  'hooks',
  'skills',
  'permissions',
  'thinking',
  'streaming'
] as const;

// ============================================================================
// Environment Variables
// ============================================================================

export const ENV_VARS = {
  RIPPERDOC_PATH: 'RIPPERDOC_PATH',
  RIPPERDOC_MODEL: 'RIPPERDOC_MODEL',
  RIPPERDOC_PERMISSION_MODE: 'RIPPERDOC_PERMISSION_MODE',
  RIPPERDOC_VERBOSE: 'RIPPERDOC_VERBOSE',
  RIPPERDOC_CONFIG: 'RIPPERDOC_CONFIG'
} as const;

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get configuration value from environment or default
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Get boolean configuration value from environment
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === '1' || value.toLowerCase() === 'true';
}

/**
 * Get numeric configuration value from environment
 */
export function getEnvNumber(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Get Ripperdoc CLI path from environment or use default
 */
export function getRipperdocPath(): string {
  return getEnv(ENV_VARS.RIPPERDOC_PATH) ?? DEFAULT_CONFIG.RIPPERDOC_PATH;
}

/**
 * Check if a tool is read-only
 */
export function isReadOnlyTool(toolName: string): boolean {
  return READ_ONLY_TOOLS.includes(toolName as (typeof READ_ONLY_TOOLS)[number]);
}

/**
 * Check if a tool is dangerous (requires permissions)
 */
export function isDangerousTool(toolName: string): boolean {
  return DANGEROUS_TOOLS.includes(toolName as (typeof DANGEROUS_TOOLS)[number]);
}

/**
 * Validate model name
 */
export function isValidModel(model: string): boolean {
  return ALL_MODELS.includes(model as (typeof ALL_MODELS)[number]);
}

/**
 * Validate permission mode
 */
export function isValidPermissionMode(mode: string): mode is 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' {
  return PERMISSION_MODES.includes(mode as (typeof PERMISSION_MODES)[number]);
}

/**
 * Normalize tool names (case-insensitive)
 */
export function normalizeToolName(toolName: string): string {
  const normalized = toolName.trim();
  const match = BUILTIN_TOOLS.find((t) => t.toLowerCase() === normalized.toLowerCase());
  return match ?? normalized;
}

/**
 * Filter tools based on allowed/disallowed lists
 */
export function filterTools(
  availableTools: readonly string[],
  allowedTools?: string[],
  disallowedTools?: string[]
): string[] {
  let tools = [...availableTools];

  if (allowedTools && allowedTools.length > 0) {
    const allowedSet = new Set(allowedTools.map(normalizeToolName));
    tools = tools.filter((t) => allowedSet.has(normalizeToolName(t)));
  }

  if (disallowedTools && disallowedTools.length > 0) {
    const disallowedSet = new Set(disallowedTools.map(normalizeToolName));
    tools = tools.filter((t) => !disallowedSet.has(normalizeToolName(t)));
  }

  return tools;
}

/**
 * Create a deep copy of options
 */
export function cloneOptions<T>(options: T): T {
  return JSON.parse(JSON.stringify(options)) as T;
}

/**
 * Merge options with defaults
 */
export function mergeOptions<T extends Record<string, unknown>>(
  defaults: T,
  options?: Partial<T>
): T {
  if (!options) {
    return { ...defaults };
  }
  return { ...defaults, ...options };
}
