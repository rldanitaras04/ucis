import { clsx } from 'clsx';

interface PageContainerProps {
  children: React.ReactNode;
  variant?: 'narrow' | 'standard' | 'wide' | 'full';
  className?: string;
}

const variants = {
  narrow: 'max-w-2xl',
  standard: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-full',
};

export default function PageContainer({ children, variant = 'standard', className }: PageContainerProps) {
  return (
    <div className={clsx('mx-auto px-4 sm:px-6 lg:px-8 py-6', variants[variant], className)}>
      {children}
    </div>
  );
}
