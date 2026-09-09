'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

interface ClinicStats {
  clinic_name: string;
  encounters: number;
  patients: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalEncounters: 0,
    todayEncounters: 0,
    activePrescriptions: 0,
    totalAuditLogs: 0,
  });
  const [clinicStats, setClinicStats] = useState<ClinicStats[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);

    // Total patients
    const { count: patientCount } = await supabase
      .from('patient_profiles')
      .select('*', { count: 'exact', head: true });

    // Total encounters
    const { count: encounterCount } = await supabase
      .from('encounters')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', dateRange.start)
      .lte('visit_date', dateRange.end);

    // Today's encounters
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('encounters')
      .select('*', { count: 'exact', head: true })
      .eq('visit_date', today);

    // Active prescriptions
    const { count: rxCount } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Audit logs count
    const { count: auditCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Clinic breakdown
    const { data: clinicData } = await supabase
      .from('encounters')
      .select('clinic_id, clinics(name)')
      .gte('visit_date', dateRange.start)
      .lte('visit_date', dateRange.end);

    const clinicMap = new Map<string, ClinicStats>();
    clinicData?.forEach((enc: any) => {
      const name = enc.clinics?.name || 'Unknown';
      if (!clinicMap.has(name)) {
        clinicMap.set(name, { clinic_name: name, encounters: 0, patients: 0 });
      }
      clinicMap.get(name)!.encounters++;
    });

    // Recent audit logs
    const { data: audits } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    setStats({
      totalPatients: patientCount || 0,
      totalEncounters: encounterCount || 0,
      todayEncounters: todayCount || 0,
      activePrescriptions: rxCount || 0,
      totalAuditLogs: auditCount || 0,
    });
    setClinicStats(Array.from(clinicMap.values()));
    setRecentAudits(audits || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-4">
          <input
            type="date"
            className="input-field"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <input
            type="date"
            className="input-field"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Patients</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalPatients}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Encounters (Period)</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalEncounters}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Today's Encounters</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.todayEncounters}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Active Prescriptions</p>
          <p className="text-3xl font-bold text-purple-600">{stats.activePrescriptions}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Audit Log Entries</p>
          <p className="text-3xl font-bold text-gray-600">{stats.totalAuditLogs}</p>
        </div>
      </div>

      {/* Clinic Breakdown */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Encounters by Clinic</h2>
        {clinicStats.length === 0 ? (
          <p className="text-gray-500">No data for selected period</p>
        ) : (
          <div className="space-y-3">
            {clinicStats.map((cs) => (
              <div key={cs.clinic_name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium">{cs.clinic_name}</span>
                <span className="text-gray-600">{cs.encounters} encounters</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Audit Logs */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Audit Logs</h2>
        {recentAudits.length === 0 ? (
          <p className="text-gray-500">No audit logs</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAudits.map((log) => (
                  <tr key={log.id}>
                    <td className="font-medium">{log.action}</td>
                    <td>{log.resource_type}</td>
                    <td className="text-sm text-gray-500">{log.user_id?.slice(0, 8)}...</td>
                    <td className="text-sm text-gray-500">{log.ip_address || '-'}</td>
                    <td className="text-sm text-gray-500">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
