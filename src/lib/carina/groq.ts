import Groq from 'groq-sdk';
import { CarinaMessage, GroqChatResponse, RateLimitEntry } from './types';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const rateLimitMap = new Map<string, RateLimitEntry>();

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function chatCompletion(
  messages: CarinaMessage[],
  tools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>,
  rateLimitKey: string,
  model?: string
): Promise<GroqChatResponse> {
  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('RATE_LIMITED');
  }

  const client = getGroqClient();
  const selectedModel = model || process.env.CARINA_MODEL || DEFAULT_MODEL;
  const temperature = parseFloat(process.env.CARINA_TEMPERATURE || String(DEFAULT_TEMPERATURE));
  const maxTokens = parseInt(process.env.CARINA_MAX_TOKENS || String(DEFAULT_MAX_TOKENS), 10);

  const formattedMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system' | 'tool',
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
  }));

  const params: Record<string, unknown> = {
    model: selectedModel,
    messages: formattedMessages,
    temperature,
    max_tokens: maxTokens,
  };

  if (tools.length > 0) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }

  const response = await client.chat.completions.create(params as any);

  return response as unknown as GroqChatResponse;
}
