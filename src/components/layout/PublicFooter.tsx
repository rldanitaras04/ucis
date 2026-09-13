import Link from 'next/link';

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'Sign In', href: '/auth/login' },
  { label: 'Register', href: '/auth/register' },
];

export default function PublicFooter() {
  return (
    <footer className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">UCIS</p>
            <p className="mt-1 text-sm text-[#64748B]">
              University Clinic Information System
            </p>
            <p className="mt-1 text-xs text-[#94A3B8]">
              A comprehensive medical and dental clinic management system.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Quick Links</p>
            <ul className="mt-2 space-y-1">
              {QUICK_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[#64748B] hover:text-[#1E40AF] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-[#E2E8F0]">
          <p className="text-center text-xs text-[#94A3B8]">
            &copy; {new Date().getFullYear()} UCIS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
