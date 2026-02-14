/**
 * In-process MCP server helpers for the SDK.
 */

export interface SdkMcpTool<T = Record<string, unknown>> {
  name: string;
  description: string;
  input_schema: Record<string, unknown> | object;
  handler: (args: T) => Promise<Record<string, unknown>>;
}

export function tool<T = Record<string, unknown>>(
  name: string,
  description: string,
  input_schema: Record<string, unknown> | object
): (handler: (args: T) => Promise<Record<string, unknown>>) => SdkMcpTool<T> {
  return (handler) => ({
    name,
    description,
    input_schema,
    handler
  });
}

interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

function convertInputSchema(inputSchema: Record<string, unknown> | object): Record<string, unknown> {
  if (typeof inputSchema !== 'object' || inputSchema === null) {
    return { type: 'object', properties: {} };
  }

  const schema = inputSchema as Record<string, unknown>;
  if (schema.type && schema.properties) {
    return schema;
  }

  const properties: Record<string, unknown> = {};
  for (const [paramName, paramType] of Object.entries(schema)) {
    if (paramType === String || paramType === 'string') {
      properties[paramName] = { type: 'string' };
    } else if (paramType === Number || paramType === 'number' || paramType === 'float') {
      properties[paramName] = { type: 'number' };
    } else if (paramType === Boolean || paramType === 'boolean') {
      properties[paramName] = { type: 'boolean' };
    } else if (paramType === 'integer') {
      properties[paramName] = { type: 'integer' };
    } else {
      properties[paramName] = { type: 'string' };
    }
  }

  return {
    type: 'object',
    properties,
    required: Object.keys(properties)
  };
}

class SdkMcpServer {
  public readonly name: string;
  public readonly version: string;
  private readonly tools: SdkMcpTool[];
  private readonly toolMap: Map<string, SdkMcpTool>;

  constructor(name: string, version: string, tools: SdkMcpTool[]) {
    this.name = name;
    this.version = version;
    this.tools = tools;
    this.toolMap = new Map(tools.map((toolDef) => [toolDef.name, toolDef]));
  }

  async listTools(): Promise<ToolSchema[]> {
    return this.tools.map((toolDef) => ({
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: convertInputSchema(toolDef.input_schema)
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const toolDef = this.toolMap.get(name);
    if (!toolDef) {
      throw new Error(`Tool '${name}' not found`);
    }

    const result = await toolDef.handler(args);
    const content: Array<Record<string, unknown>> = [];

    if (Array.isArray(result.content)) {
      for (const item of result.content as Array<Record<string, unknown>>) {
        if (item.type === 'text') {
          content.push({ type: 'text', text: item.text });
        } else if (item.type === 'image') {
          content.push({ type: 'image', data: item.data, mimeType: item.mimeType });
        }
      }
    }

    const response: Record<string, unknown> = { content };
    if (result.is_error) {
      response.is_error = true;
    }

    return response;
  }
}

export function createSdkMcpServer(
  name: string,
  version = '1.0.0',
  tools: SdkMcpTool[] | null = null
): { type: 'sdk'; name: string; instance: SdkMcpServer } {
  const server = new SdkMcpServer(name, version, tools ?? []);
  return {
    type: 'sdk',
    name,
    instance: server
  };
}
