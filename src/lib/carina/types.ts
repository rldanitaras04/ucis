export interface CarinaSecurityContext {
  authenticated: boolean;
  userId: string | null;
  email?: string;
  roles: string[];
  permissions: string[];
  clinicIds: string[];
  campusIds: string[];
  providerProfileId: string | null;
  providerType: 'doctor' | 'dentist' | null;
  patientProfileId: string | null;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface CarinaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: CarinaToolCall[];
}

export interface CarinaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CarinaToolDefinition {
  name: string;
  description: string;
  allowedRoles: string[];
  requiredPermission?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>, ctx: CarinaSecurityContext) => Promise<CarinaToolResult>;
}

export interface CarinaToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface CarinaToolCallExecution {
  toolCallId: string;
  name: string;
  result: CarinaToolResult;
}

export interface CarinaResponse {
  message: string;
  toolCalls?: CarinaToolCall[];
  toolResults?: CarinaToolCallExecution[];
}

export interface GroqChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: CarinaToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface CarinaRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: {
    currentRoute?: string;
    currentModule?: string;
    currentEntityType?: string;
    currentEntityId?: string;
  };
}
