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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Total Patients</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalPatients}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Encounters</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalEncounters}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Prescriptions</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.totalPrescriptions}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Referrals</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.totalReferrals}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Clinic Breakdown</h2>
            {stats.clinicBreakdown.length === 0 ? (
              <p className="text-gray-500">No data available for this period</p>
            ) : (
              <div className="space-y-3">
                {stats.clinicBreakdown.map((clinic) => (
                  <div key={clinic.name} className="flex items-center justify-between py-2 border-b">
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-blue-600 font-semibold">{clinic.count} encounters</span>
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
