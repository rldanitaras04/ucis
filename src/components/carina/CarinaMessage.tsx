'use client';

import { CarinaToolCallExecution } from '@/lib/carina/types';

interface CarinaMessageProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolResults?: CarinaToolCallExecution[];
}

function formatMessageContent(content: string): string {
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-[#F1F5F9] px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br />');
  return formatted;
}

export default function CarinaMessage({ role, content, toolResults }: CarinaMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[80%] bg-[#1E40AF] text-white rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  if (role === 'tool') {
    return null;
  }

  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <img src="/carina.png" alt="Carina" className="w-full h-full object-cover" />
      </div>
      <div className="max-w-[80%]">
        <div className="bg-[#F8FAFC] text-[#0F172A] rounded-2xl rounded-bl-sm px-4 py-3 border border-[#E2E8F0]">
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatMessageContent(content) }}
          />
        </div>
        {toolResults && toolResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {toolResults.map((result) => (
              <div
                key={result.toolCallId}
                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                  result.result.success
                    ? 'bg-[#ECFDF5] text-[#059669] border border-[#6EE7B7]'
                    : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                }`}
              >
                <span className="font-medium">{result.name}</span>
                <span aria-hidden="true">
                  {result.result.success ? ' - Completed' : ` - ${result.result.error}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
