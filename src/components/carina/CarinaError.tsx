'use client';

interface CarinaErrorProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function CarinaError({ message, onDismiss, onRetry }: CarinaErrorProps) {
  return (
    <div
      role="alert"
      className="mx-4 my-2 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-4 py-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-[#DC2626] mt-0.5 font-bold" aria-hidden="true">!</span>
          <p className="text-sm text-[#DC2626]">{message}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-[#DC2626] hover:text-[#B91C1C] px-2 py-1 text-xs font-medium rounded hover:bg-red-100 transition-colors"
              aria-label="Retry"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-[#DC2626] hover:text-[#B91C1C] p-1 rounded hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
