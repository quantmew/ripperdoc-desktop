/**
 * Ripperdoc Agent SDK - TypeScript
 * Main entry point.
 */

// ========================================================================
// Main Client & Query
// ========================================================================

export { RipperdocSDKClient, query } from './client/index.js';

// ========================================================================
// Version
// ========================================================================

export { __version__ } from './version.js';

// ========================================================================
// Transport
// ========================================================================

export { StdioTransport } from './transport/stdio.js';
export type { Transport } from './transport/transport.js';

// ========================================================================
// MCP SDK Helpers
// ========================================================================

export { createSdkMcpServer, tool } from './mcp/sdk.js';
export type { SdkMcpTool } from './mcp/sdk.js';

// ========================================================================
// Types
// ========================================================================

export type {
  // Permission Modes & Beta
  PermissionMode,
  SdkBeta,
  SettingSource,

  // Agent definitions
  SystemPromptPreset,
  ToolsPreset,
  AgentDefinition,

  // Permission types
  PermissionUpdate,
  PermissionRuleValue,
  PermissionResult,
  PermissionResultAllow,
  PermissionResultDeny,
  PermissionBehavior,
  PermissionUpdateDestination,
  ToolPermissionContext,
  CanUseTool,

  // Hook types
  HookEvent,
  HookMatcher,
  HookCallback,
  HookContext,
  HookInput,
  HookJSONOutput,
  BaseHookInput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  UserPromptSubmitHookInput,
  StopHookInput,
  SubagentStopHookInput,
  PreCompactHookInput,

  // MCP Config
  McpServerConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
  SdkPluginConfig,

  // Sandbox
  SandboxSettings,
  SandboxNetworkConfig,
  SandboxIgnoreViolations,

  // Content blocks
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,

  // Messages
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ResultMessage,
  StreamEvent,
  Message,

  // Options
  RipperdocAgentOptions
} from './types/index.js';

// ========================================================================
// Errors
// ========================================================================

export {
  RipperdocSDKError,
  CLIConnectionError,
  CLINotFoundError,
  ProcessError,
  CLIJSONDecodeError,
  MessageParseError
} from './errors/index.js';

// ========================================================================
// Config Utilities (kept for compatibility)
// ========================================================================

export {
  DEFAULT_CONFIG,
  ANTHROPIC_MODELS,
  OPENAI_MODELS,
  DEEPSEEK_MODELS,
  ALL_MODELS,
  BUILTIN_TOOLS,
  READ_ONLY_TOOLS,
  DANGEROUS_TOOLS,
  PERMISSION_MODES,
  PERMISSION_MODE_DESCRIPTIONS,
  SERVER_FEATURES,
  ENV_VARS,
  getEnv,
  getEnvBool,
  getEnvNumber,
  getRipperdocPath,
  isReadOnlyTool,
  isDangerousTool,
  isValidModel,
  isValidPermissionMode,
  normalizeToolName,
  filterTools,
  cloneOptions,
  mergeOptions
} from './config/index.js';
