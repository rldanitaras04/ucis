'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CarinaMessage as CarinaMessageType, CarinaToolCallExecution, CarinaResponse } from '@/lib/carina/types';
import CarinaHeader from './CarinaHeader';
import CarinaMessageList from './CarinaMessageList';
import CarinaInput from './CarinaInput';
import CarinaSuggestions from './CarinaSuggestions';
import CarinaEmptyState from './CarinaEmptyState';
import CarinaError from './CarinaError';
import CarinaVitalsAnalysis from './CarinaVitalsAnalysis';
import CarinaFBSAnalysis from './CarinaFBSAnalysis';

interface CarinaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roles: string[];
  userName?: string;
  userAvatarUrl?: string | null;
}

export default function CarinaPanel({ isOpen, onClose, roles, userName, userAvatarUrl }: CarinaPanelProps) {
  const [messages, setMessages] = useState<CarinaMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<CarinaToolCallExecution[]>([]);
  const [vitalsData, setVitalsData] = useState<Record<string, string | null> | null>(null);
  const [fbsData, setFbsData] = useState<Record<string, string | null> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async (content: string) => {
    setError(null);
    setToolResults([]);

    const userMessage: CarinaMessageType = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/carina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const data: CarinaResponse = await response.json();

      const assistantMessage: CarinaMessageType = {
        role: 'assistant',
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.toolResults) {
        setToolResults(data.toolResults);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const handleRetry = useCallback(() => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        handleSend(lastUserMessage.content);
      }
    }
  }, [messages, handleSend]);

  useEffect(() => {
    const handleAnalyzeVitals = (e: CustomEvent) => {
      setVitalsData(e.detail.vitals);
    };
    const handleClearVitals = () => {
      setVitalsData(null);
    };
    const handleAnalyzeFBS = (e: CustomEvent) => {
      setFbsData(e.detail.fbs);
    };
    const handleClearFBS = () => {
      setFbsData(null);
    };

    window.addEventListener('carina:analyze-vitals', handleAnalyzeVitals as EventListener);
    window.addEventListener('carina:clear-vitals', handleClearVitals);
    window.addEventListener('carina:analyze-fbs', handleAnalyzeFBS as EventListener);
    window.addEventListener('carina:clear-fbs', handleClearFBS);
    return () => {
      window.removeEventListener('carina:analyze-vitals', handleAnalyzeVitals as EventListener);
      window.removeEventListener('carina:clear-vitals', handleClearVitals);
      window.removeEventListener('carina:analyze-fbs', handleAnalyzeFBS as EventListener);
      window.removeEventListener('carina:clear-fbs', handleClearFBS);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Carina AI Assistant"
      tabIndex={-1}
      className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 outline-none max-sm:inset-x-2 max-sm:bottom-16 max-sm:h-[calc(100vh-8rem)]"
    >
      <CarinaHeader onClose={onClose} />

      {error && (
        <CarinaError message={error} onDismiss={() => setError(null)} onRetry={handleRetry} />
      )}

      {(vitalsData || fbsData) && (
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {vitalsData && <CarinaVitalsAnalysis vitals={vitalsData} />}
          {fbsData && <CarinaFBSAnalysis fbs={fbsData} />}
        </div>
      )}

      {!vitalsData && !fbsData && messages.length === 0 ? (
        <CarinaEmptyState userName={userName} />
      ) : (
        <CarinaMessageList messages={messages} isLoading={isLoading} toolResults={toolResults} userAvatarUrl={userAvatarUrl} />
      )}

      {messages.length === 0 && !vitalsData && !fbsData && (
        <CarinaSuggestions roles={roles} onSelect={handleSend} />
      )}

      <CarinaInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
