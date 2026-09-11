'use client';

import { Suspense } from 'react';
import DispensingHistoryPage from '@/app/(app)/dispensing/history-page';

export default function DispensingHistoryRoute() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <DispensingHistoryPage />
    </Suspense>
  );
}
