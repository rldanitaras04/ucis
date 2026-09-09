import { CarinaSecurityContext, CarinaToolResult, CarinaToolCallExecution } from './types';
import { getCarinaTools } from './tools';

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CarinaSecurityContext
): Promise<CarinaToolResult> {
  const tools = getCarinaTools(ctx);
  const tool = tools.find(t => t.name === toolName);

  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  if (!ctx.authenticated && tool.allowedRoles.length > 0) {
    return { success: false, error: 'Authentication required for this action.' };
  }

  if (ctx.authenticated && !ctx.roles.includes('super_admin')) {
    if (tool.allowedRoles.length > 0) {
      const hasRole = tool.allowedRoles.some(role => ctx.roles.includes(role));
      if (!hasRole) {
        return { success: false, error: 'Insufficient permissions for this action.' };
      }
    }
  }

  if (tool.requiredPermission && !ctx.permissions.includes(tool.requiredPermission)) {
    if (!ctx.roles.includes('super_admin')) {
      return { success: false, error: 'Missing required permission for this action.' };
    }
  }

  try {
    return await tool.handler(args, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: message };
  }
}

export async function executeToolCalls(
  toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>,
  ctx: CarinaSecurityContext
): Promise<CarinaToolCallExecution[]> {
  const results: CarinaToolCallExecution[] = [];

  for (const toolCall of toolCalls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      results.push({
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        result: { success: false, error: 'Invalid tool arguments JSON' },
      });
      continue;
    }

    const result = await executeTool(toolCall.function.name, args, ctx);
    results.push({
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      result,
    });
  }

  return results;
}
