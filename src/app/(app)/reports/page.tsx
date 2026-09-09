'use client';

import { useState, useEffect } from 'react';
import { fetchReportStats } from './actions';

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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await fetchReportStats(dateRange as 'week' | 'month' | 'year');
      if (result.success) {
        setStats({
          totalPatients: result.data.totalPatients,
          totalEncounters: result.data.periodEncounters,
          totalPrescriptions: result.data.periodPrescriptions,
          totalReferrals: result.data.periodReferrals,
          clinicBreakdown: result.data.clinicBreakdown,
          recentActivity: [],
        });
      } else {
        setError(result.error);
      }
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
