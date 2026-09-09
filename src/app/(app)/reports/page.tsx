'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReportStats {
  totalPatients: number;
  totalEncounters: number;
  totalPrescriptions: number;
  totalReferrals: number;
  clinicBreakdown: { name: string; count: number }[];
  recentActivity: any[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const supabase = createClient();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const startDateStr = startDate.toISOString();

      const [patientsResult, encountersResult, prescriptionsResult, referralsResult, clinicResult] = await Promise.all([
        supabase.from('patient_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('encounters').select('id', { count: 'exact', head: true }).gte('encounter_date', startDateStr),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).gte('prescribed_date', startDateStr),
        supabase.from('referrals').select('id', { count: 'exact', head: true }).gte('referral_date', startDateStr),
        supabase.from('encounters').select('clinic:clinics!clinic_id(name)').gte('encounter_date', startDateStr),
      ]);

      const clinicCounts: Record<string, number> = {};
      clinicResult.data?.forEach((e: any) => {
        const name = e.clinic?.name || 'Unknown';
        clinicCounts[name] = (clinicCounts[name] || 0) + 1;
      });

      const clinicBreakdown = Object.entries(clinicCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalPatients: patientsResult.count || 0,
        totalEncounters: encountersResult.count || 0,
        totalPrescriptions: prescriptionsResult.count || 0,
        totalReferrals: referralsResult.count || 0,
        clinicBreakdown,
        recentActivity: [],
      });
    } catch (err) {
      setError('Failed to load report data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading reports">
        <div className="spinner"></div>
        <span className="sr-only">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Reports</h1>
        <label htmlFor="dateRange" className="sr-only">Select date range</label>
        <select
          id="dateRange"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="select-field w-auto"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card border-l-4 border-l-[#1E40AF]">
              <h3 className="text-subheading text-[#0F172A]">Total Patients</h3>
              <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{stats.totalPatients}</p>
            </div>
            <div className="card border-l-4 border-l-[#059669]">
              <h3 className="text-subheading text-[#0F172A]">Encounters</h3>
              <p className="text-3xl font-bold text-[#059669] tabular-nums">{stats.totalEncounters}</p>
            </div>
            <div className="card border-l-4 border-l-[#2563EB]">
              <h3 className="text-subheading text-[#0F172A]">Prescriptions</h3>
              <p className="text-3xl font-bold text-[#2563EB] tabular-nums">{stats.totalPrescriptions}</p>
            </div>
            <div className="card border-l-4 border-l-[#D97706]">
              <h3 className="text-subheading text-[#0F172A]">Referrals</h3>
              <p className="text-3xl font-bold text-[#D97706] tabular-nums">{stats.totalReferrals}</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-subheading text-[#0F172A] mb-4">Clinic Breakdown</h2>
            {stats.clinicBreakdown.length === 0 ? (
              <p className="text-body text-[#64748B]">No data available for this period</p>
            ) : (
              <div className="space-y-3">
                {stats.clinicBreakdown.map((clinic) => (
                  <div key={clinic.name} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                    <span className="font-medium text-[#0F172A]">{clinic.name}</span>
                    <span className="text-[#1E40AF] font-semibold tabular-nums">{clinic.count} encounters</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
