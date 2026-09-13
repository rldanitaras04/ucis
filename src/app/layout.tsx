import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CarinaLauncher from '@/components/carina/CarinaLauncher';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'UCIS - University Clinic Information System',
    template: '%s | UCIS',
  },
  description: 'Medical and Dental Clinic Information System for Philippine State Universities',
  keywords: ['clinic', 'medical', 'dental', 'university', 'healthcare', 'UCIS'],
  icons: {
    icon: '/favicon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UCIS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1E40AF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '0.75rem',
            },
          }}
        />
        {children}
        <CarinaLauncher />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
