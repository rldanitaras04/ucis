import Link from 'next/link';
import Image from 'next/image';

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'User Roles', href: '/#roles' },
];

const ACCOUNT_LINKS = [
  { label: 'Sign In', href: '/auth/login' },
  { label: 'Register', href: '/auth/register' },
];

export default function PublicFooter() {
  return (
    <footer className="bg-[#0F172A] border-t border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/clinic_logo.png"
                alt="UCIS Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-lg font-bold text-white">U-Care</span>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              University Clinic Information System — comprehensive medical and dental clinic management for Philippine state universities.
            </p>
            <p className="mt-3 text-xs text-[#64748B]">
              Iloilo State University of Fisheries Science and Technology — Dingle Campus
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Platform</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Account</h3>
            <ul className="space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">University</h3>
            <Image
              src="/isufst_logo.png"
              alt="ISUFST Logo"
              width={64}
              height={64}
              className="rounded-lg mb-3"
            />
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li>Iloilo State University of Fisheries Science and Technology - Dingle Campus</li>
              <li>Dingle, Iloilo, Philippines</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#1E293B]">
          <p className="text-center text-xs text-[#64748B]">
            &copy; {new Date().getFullYear()} U-Care — University Clinic Information System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
