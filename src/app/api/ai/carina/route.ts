import { NextRequest, NextResponse } from 'next/server';
import { buildCarinaSecurityContext } from '@/lib/carina/security-context';
import { buildCarinaSystemPrompt } from '@/lib/carina/prompt';
import { getCarinaTools, toolDefinitionsForGroq } from '@/lib/carina/tools';
import { chatCompletion } from '@/lib/carina/groq';
import { executeToolCalls } from '@/lib/carina/gateway';
import { CarinaMessage, CarinaRequest, CarinaResponse } from '@/lib/carina/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_TOOL_CALL_ROUNDS = 3;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CarinaRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty.' },
        { status: 400 }
      );
    }

    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage.content || lastMessage.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content must not be empty.' },
        { status: 400 }
      );
    }

    if (lastMessage.content.length > 4000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 4000 characters.' },
        { status: 400 }
      );
    }

    const ctx = await buildCarinaSecurityContext();
    const tools = getCarinaTools(ctx);
    const groqTools = toolDefinitionsForGroq(tools);
    const systemPrompt = buildCarinaSystemPrompt(ctx);

    const messages: CarinaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map(m => ({ role: 'user' as const, content: m.content })),
    ];

    const rateLimitKey = ctx.userId || request.headers.get('x-forwarded-for') || 'anonymous';
    let response = await chatCompletion(messages, groqTools, rateLimitKey);

    let toolResults: CarinaResponse['toolResults'] = [];
    let rounds = 0;

    while (response.choices[0]?.message?.tool_calls && rounds < MAX_TOOL_CALL_ROUNDS) {
      const toolCalls = response.choices[0].message.tool_calls;
      const results = await executeToolCalls(toolCalls, ctx);
      toolResults = [...toolResults, ...results];

      messages.push({
        role: 'assistant',
        content: response.choices[0].message.content || '',
        tool_calls: toolCalls,
      });

      for (const result of results) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          tool_call_id: result.toolCallId,
        });
      }

      response = await chatCompletion(messages, groqTools, rateLimitKey);
      rounds++;
    }

    const finalContent = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    const supabase = createServerSupabaseClient();
    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId || '00000000-0000-0000-0000-000000000000',
      p_action: 'carina.chat',
      p_resource_type: 'carina_conversations',
      p_resource_id: '00000000-0000-0000-0000-000000000000',
      p_outcome: 'success',
    });

    const carinaResponse: CarinaResponse = {
      message: finalContent,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };

    return NextResponse.json(carinaResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'RATE_LIMITED') {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    if (message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
