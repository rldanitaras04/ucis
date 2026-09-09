'use client';

export default function CarinaTypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3" role="status" aria-label="Carina is typing">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <img src="/carina.png" alt="Carina" className="w-full h-full object-cover" />
      </div>
      <div className="bg-[#F8FAFC] rounded-2xl px-4 py-3 border border-[#E2E8F0]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 bg-[#94A3B8] rounded-full motion-safe:animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-[#94A3B8] rounded-full motion-safe:animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-[#94A3B8] rounded-full motion-safe:animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
      <span className="sr-only">Carina is thinking...</span>
    </div>
  );
}
