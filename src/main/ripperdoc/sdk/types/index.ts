/**
 * Core type definitions for the Ripperdoc SDK (TypeScript)
 * Ported from the Python SDK.
 */

// ============================================================================
// Permission Modes
// ============================================================================

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';

// ============================================================================
// SDK Beta Features
// ============================================================================

export type SdkBeta = 'context-1m-2025-08-07';

// ============================================================================
// Agent Definitions
// ============================================================================

export type SettingSource = 'user' | 'project' | 'local';

export interface SystemPromptPreset {
  type: 'preset';
  preset: 'ripperdoc_code';
  append?: string;
}

export interface ToolsPreset {
  type: 'preset';
  preset: 'ripperdoc_code';
}

export interface AgentDefinition {
  description: string;
  prompt: string;
  tools?: string[] | null;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit' | null;
}

// ============================================================================
// Permission Update Types
// ============================================================================

export type PermissionUpdateDestination = 'userSettings' | 'projectSettings' | 'localSettings' | 'session';

export type PermissionBehavior = 'allow' | 'deny' | 'ask';

export interface PermissionRuleValue {
  tool_name: string;
  rule_content?: string | null;
}

export interface PermissionUpdate {
  type: 'addRules' | 'replaceRules' | 'removeRules' | 'setMode' | 'addDirectories' | 'removeDirectories';
  rules?: PermissionRuleValue[] | null;
  behavior?: PermissionBehavior | null;
  mode?: PermissionMode | null;
  directories?: string[] | null;
  destination?: PermissionUpdateDestination | null;
}

export interface ToolPermissionContext {
  signal?: AbortSignal | null;
  suggestions: PermissionUpdate[];
}

export interface PermissionResultAllow {
  behavior: 'allow';
  updated_input?: Record<string, unknown> | null;
  updated_permissions?: PermissionUpdate[] | null;
}

export interface PermissionResultDeny {
  behavior: 'deny';
  message?: string;
  interrupt?: boolean;
}

export type PermissionResult = PermissionResultAllow | PermissionResultDeny;

export type CanUseTool = (
  tool_name: string,
  input: Record<string, unknown>,
  context: ToolPermissionContext
) => PermissionResult | Promise<PermissionResult>;

// ============================================================================
// Hook Types
// ============================================================================

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact';

export interface BaseHookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
}

export interface PreToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface PostToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: unknown;
}

export interface UserPromptSubmitHookInput extends BaseHookInput {
  hook_event_name: 'UserPromptSubmit';
  prompt: string;
}

export interface StopHookInput extends BaseHookInput {
  hook_event_name: 'Stop';
  stop_hook_active: boolean;
}

export interface SubagentStopHookInput extends BaseHookInput {
  hook_event_name: 'SubagentStop';
  stop_hook_active: boolean;
}

export interface PreCompactHookInput extends BaseHookInput {
  hook_event_name: 'PreCompact';
  trigger: 'manual' | 'auto';
  custom_instructions: string | null;
}

export type HookInput =
  | PreToolUseHookInput
  | PostToolUseHookInput
  | UserPromptSubmitHookInput
  | StopHookInput
  | SubagentStopHookInput
  | PreCompactHookInput;

export interface PreToolUseHookSpecificOutput {
  hookEventName: 'PreToolUse';
  permissionDecision?: 'allow' | 'deny' | 'ask';
  permissionDecisionReason?: string;
  updatedInput?: Record<string, unknown>;
}

export interface PostToolUseHookSpecificOutput {
  hookEventName: 'PostToolUse';
  additionalContext?: string;
}

export interface UserPromptSubmitHookSpecificOutput {
  hookEventName: 'UserPromptSubmit';
  additionalContext?: string;
}

export interface SessionStartHookSpecificOutput {
  hookEventName: 'SessionStart';
  additionalContext?: string;
}

export type HookSpecificOutput =
  | PreToolUseHookSpecificOutput
  | PostToolUseHookSpecificOutput
  | UserPromptSubmitHookSpecificOutput
  | SessionStartHookSpecificOutput;

export interface AsyncHookJSONOutput {
  async?: true;
  async_?: true;
  asyncTimeout?: number;
}

export interface SyncHookJSONOutput {
  continue?: boolean;
  continue_?: boolean;
  suppressOutput?: boolean;
  stopReason?: string;
  decision?: 'block';
  systemMessage?: string;
  reason?: string;
  hookSpecificOutput?: HookSpecificOutput;
}

export type HookJSONOutput = AsyncHookJSONOutput | SyncHookJSONOutput;

export interface HookContext {
  signal?: AbortSignal | null;
}

export type HookCallback = (
  input: HookInput,
  tool_use_id: string | null,
  context: HookContext
) => HookJSONOutput | Promise<HookJSONOutput>;

export interface HookMatcher {
  matcher?: string | null;
  hooks: HookCallback[];
  timeout?: number | null;
}

// ============================================================================
// MCP Server Config
// ============================================================================

export interface McpStdioServerConfig {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpSSEServerConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export interface McpHttpServerConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface McpSdkServerConfig {
  type: 'sdk';
  name: string;
  instance: unknown;
}

export type McpServerConfig = McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig | McpSdkServerConfig;

export interface SdkPluginConfig {
  type: 'local';
  path: string;
}

// ============================================================================
// Sandbox Config
// ============================================================================

export interface SandboxNetworkConfig {
  allowUnixSockets?: string[];
  allowAllUnixSockets?: boolean;
  allowLocalBinding?: boolean;
  httpProxyPort?: number;
  socksProxyPort?: number;
}

export interface SandboxIgnoreViolations {
  file?: string[];
  network?: string[];
}

export interface SandboxSettings {
  enabled?: boolean;
  autoAllowBashIfSandboxed?: boolean;
  excludedCommands?: string[];
  allowUnsandboxedCommands?: boolean;
  network?: SandboxNetworkConfig;
  ignoreViolations?: SandboxIgnoreViolations;
  enableWeakerNestedSandbox?: boolean;
}

// ============================================================================
// Content Blocks
// ============================================================================

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string | Array<Record<string, unknown>> | null;
  is_error?: boolean | null;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

// ============================================================================
// Message Types
// ============================================================================

export type AssistantMessageError =
  | 'authentication_failed'
  | 'billing_error'
  | 'rate_limit'
  | 'invalid_request'
  | 'server_error'
  | 'unknown';

export interface UserMessage {
  type: 'user';
  content: string | ContentBlock[];
  uuid?: string | null;
  parent_tool_use_id?: string | null;
  tool_use_result?: Record<string, unknown> | null;
}

export interface AssistantMessage {
  type: 'assistant';
  content: ContentBlock[];
  model: string;
  parent_tool_use_id?: string | null;
  error?: AssistantMessageError | null;
}

export interface SystemMessage {
  type: 'system';
  subtype: string;
  data: Record<string, unknown>;
}

export interface ResultMessage {
  type: 'result';
  subtype: string;
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  session_id: string;
  total_cost_usd?: number | null;
  usage?: Record<string, unknown> | null;
  result?: string | null;
  structured_output?: unknown;
}

export interface StreamEvent {
  type: 'stream_event';
  uuid: string;
  session_id: string;
  event: Record<string, unknown>;
  parent_tool_use_id?: string | null;
}

export type Message = UserMessage | AssistantMessage | SystemMessage | ResultMessage | StreamEvent;

// ============================================================================
// Ripperdoc Agent Options
// ============================================================================

export interface RipperdocAgentOptions {
  tools?: string[] | ToolsPreset | null;
  allowed_tools?: string[];
  system_prompt?: string | SystemPromptPreset | null;
  mcp_servers?: Record<string, McpServerConfig> | string;
  permission_mode?: PermissionMode | null;
  continue_conversation?: boolean;
  resume?: string | null;
  max_turns?: number | null;
  max_budget_usd?: number | null;
  disallowed_tools?: string[];
  model?: string | null;
  fallback_model?: string | null;
  betas?: SdkBeta[];
  permission_prompt_tool_name?: string | null;
  cwd?: string | null;
  cli_path?: string | null;
  settings?: string | null;
  add_dirs?: Array<string>;
  env?: Record<string, string>;
  extra_args?: Record<string, string | null>;
  max_buffer_size?: number | null;
  debug_stderr?: NodeJS.WritableStream | { write: (chunk: string) => void; flush?: () => void } | null;
  stderr?: ((line: string) => void) | null;
  can_use_tool?: CanUseTool | null;
  hooks?: Partial<Record<HookEvent, HookMatcher[]>> | null;
  user?: string | null;
  include_partial_messages?: boolean;
  fork_session?: boolean;
  agents?: Record<string, AgentDefinition> | null;
  setting_sources?: SettingSource[] | null;
  sandbox?: SandboxSettings | null;
  plugins?: SdkPluginConfig[];
  max_thinking_tokens?: number | null;
  output_format?: Record<string, unknown> | null;
  enable_file_checkpointing?: boolean;
}

// ============================================================================
// SDK Control Protocol Types
// ============================================================================

export interface SDKControlInterruptRequest {
  subtype: 'interrupt';
}

export interface SDKControlPermissionRequest {
  subtype: 'can_use_tool';
  tool_name: string;
  input: Record<string, unknown>;
  permission_suggestions?: unknown[] | null;
  blocked_path?: string | null;
}

export interface SDKControlInitializeRequest {
  subtype: 'initialize';
  hooks: Record<string, unknown> | null;
}

export interface SDKControlSetPermissionModeRequest {
  subtype: 'set_permission_mode';
  mode: string;
}

export interface SDKHookCallbackRequest {
  subtype: 'hook_callback';
  callback_id: string;
  input: unknown;
  tool_use_id: string | null;
}

export interface SDKControlMcpMessageRequest {
  subtype: 'mcp_message';
  server_name: string;
  message: Record<string, unknown>;
}

export interface SDKControlRewindFilesRequest {
  subtype: 'rewind_files';
  user_message_id: string;
}

export interface SDKControlRequest {
  type: 'control_request';
  request_id: string;
  request:
    | SDKControlInterruptRequest
    | SDKControlPermissionRequest
    | SDKControlInitializeRequest
    | SDKControlSetPermissionModeRequest
    | SDKHookCallbackRequest
    | SDKControlMcpMessageRequest
    | SDKControlRewindFilesRequest;
}

export interface ControlResponse {
  subtype: 'success';
  request_id: string;
  response: Record<string, unknown> | null;
}

export interface ControlErrorResponse {
  subtype: 'error';
  request_id: string;
  error: string;
}

export interface SDKControlResponse {
  type: 'control_response';
  response: ControlResponse | ControlErrorResponse;
}
