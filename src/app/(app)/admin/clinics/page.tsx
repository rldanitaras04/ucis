'use client';

import { useState, useEffect } from 'react';
import { fetchAllClinics } from './actions';
import { DEFAULT_CLINIC_ID, DEFAULT_CLINIC_NAME, DEFAULT_CAMPUS_NAME } from '@/lib/config';

interface Clinic {
  id: string;
  name: string;
  description?: string;
  location?: string;
  operating_hours?: string;
  is_active: boolean;
}

export default function AdminClinicsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const result = await fetchAllClinics();
      if (result.success) {
        const found = result.data.find((c: Clinic) => c.id === DEFAULT_CLINIC_ID);
        setClinic(found || null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading clinic">
        <div className="spinner"></div>
        <span className="sr-only">Loading clinic...</span>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-heading text-[#0F172A] mb-6">Clinic Settings</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">{error}</div>
      )}

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-subheading text-[#0F172A]">{clinic?.name || DEFAULT_CLINIC_NAME}</h2>
          <span className={`badge ${clinic?.is_active ? 'badge-success' : 'badge-neutral'}`}>
            {clinic?.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#64748B]">Campus</span>
            <p className="font-medium text-[#0F172A]">{DEFAULT_CAMPUS_NAME}</p>
          </div>
          <div>
            <span className="text-[#64748B]">Clinic ID</span>
            <p className="font-mono text-[#0F172A] text-xs">{DEFAULT_CLINIC_ID}</p>
          </div>
          {clinic?.location && (
            <div>
              <span className="text-[#64748B]">Location</span>
              <p className="font-medium text-[#0F172A]">{clinic.location}</p>
            </div>
          )}
          {clinic?.operating_hours && (
            <div>
              <span className="text-[#64748B]">Operating Hours</span>
              <p className="font-medium text-[#0F172A]">{clinic.operating_hours}</p>
            </div>
          )}
        </div>

        {clinic?.description && (
          <div>
            <span className="text-[#64748B] text-sm">Description</span>
            <p className="text-[#0F172A]">{clinic.description}</p>
          </div>
        )}

        <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg px-4 py-3 text-sm text-[#0369A1]">
          This system is configured for a single clinic. Clinic details are managed via database seed data.
        </div>
      </div>
    </div>
  );
}
