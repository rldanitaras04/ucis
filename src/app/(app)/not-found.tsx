import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-[#64748B]">404</span>
        </div>
        <h2 className="text-subheading text-[#0F172A] mb-2">Page not found</h2>
        <p className="text-sm text-[#64748B] mb-4">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
