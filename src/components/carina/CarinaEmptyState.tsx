'use client';

interface CarinaEmptyStateProps {
  userName?: string;
}

export default function CarinaEmptyState({ userName }: CarinaEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-lg">
        <img src="/carina.png" alt="Carina" className="w-full h-full object-cover" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-1">
        Hi{userName ? `, ${userName}` : ''}! I&apos;m Carina
      </h3>
      <p className="text-sm text-[#64748B] text-center mb-6">
        Your UCIS AI Assistant. I can help you manage patients, queues, prescriptions, and more.
      </p>
    </div>
  );
}
