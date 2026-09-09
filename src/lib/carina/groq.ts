import { CarinaMessage, GroqChatResponse, RateLimitEntry } from './types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const rateLimitMap = new Map<string, RateLimitEntry>();

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('RATE_LIMITED');
  }

  const selectedModel = model || process.env.CARINA_MODEL || DEFAULT_MODEL;
  const temperature = parseFloat(process.env.CARINA_TEMPERATURE || String(DEFAULT_TEMPERATURE));
  const maxTokens = parseInt(process.env.CARINA_MAX_TOKENS || String(DEFAULT_MAX_TOKENS), 10);

  const body: Record<string, unknown> = {
    model: selectedModel,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    })),
    temperature,
    max_tokens: maxTokens,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  if (response.status === 401) {
    throw new Error('Invalid Groq API key');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as GroqChatResponse;
}
