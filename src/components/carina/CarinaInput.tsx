'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface CarinaInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function CarinaInput({ onSend, disabled }: CarinaInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="border-t border-[#E2E8F0] px-4 py-3">
      <div className="flex items-end gap-2">
        <label htmlFor="carina-input" className="sr-only">
          Message to Carina
        </label>
        <textarea
          id="carina-input"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask Carina anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
          style={{ minHeight: '40px', maxHeight: '120px' }}
          aria-describedby="carina-input-hint"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex-shrink-0 w-12 h-12 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p id="carina-input-hint" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
