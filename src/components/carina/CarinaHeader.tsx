'use client';

import { useEffect, useRef } from 'react';

interface CarinaHeaderProps {
  onClose: () => void;
}

export default function CarinaHeader({ onClose }: CarinaHeaderProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="bg-[#1E40AF] text-white px-4 py-3 flex items-center justify-between rounded-t-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
          <img src="/carina.png" alt="Carina" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Carina</h3>
          <p className="text-xs text-white/80">UCIS AI Assistant</p>
        </div>
      </div>
      <button
        ref={closeRef}
        onClick={onClose}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Close Carina assistant"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
