'use client';

import { useEffect, useRef } from 'react';
import { CarinaMessage as CarinaMessageType, CarinaToolCallExecution } from '@/lib/carina/types';
import CarinaMessage from './CarinaMessage';
import CarinaTypingIndicator from './CarinaTypingIndicator';

interface CarinaMessageListProps {
  messages: CarinaMessageType[];
  isLoading: boolean;
  toolResults?: CarinaToolCallExecution[];
  userAvatarUrl?: string | null;
}

export default function CarinaMessageList({ messages, isLoading, toolResults, userAvatarUrl }: CarinaMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const lastAssistantResults = toolResults && toolResults.length > 0
    ? toolResults.filter(t => t.name !== 'general_query')
    : undefined;
  const hasToolResults = lastAssistantResults && lastAssistantResults.length > 0;

  return (
    <div
      className="flex-1 overflow-y-auto px-2 py-4"
      role="log"
      aria-label="Carina conversation"
      aria-live="polite"
    >
      {messages.map((msg, idx) => (
        <CarinaMessage
          key={idx}
          role={msg.role as 'user' | 'assistant'}
          content={msg.content}
          toolResults={idx === messages.length - 1 ? hasToolResults ? lastAssistantResults : undefined : undefined}
          userAvatarUrl={userAvatarUrl}
        />
      ))}
      {isLoading && <CarinaTypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
