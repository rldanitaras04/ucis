'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface DashboardContentProps {
  userId: string;
  roles: string[];
  profile: UserProfile;
}

export default function DashboardContent({ userId, roles, profile }: DashboardContentProps) {
  const [waitingCount, setWaitingCount] = useState(0);
  const [inServiceCount, setInServiceCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Load queue stats — catch RLS errors gracefully
        const { data: queueData, error: queueErr } = await supabase
          .from('queue_entries')
          .select('id, status')
          .eq('queue_date', today);

        if (!queueErr && queueData) {
          setWaitingCount(queueData.filter(q => q.status === 'waiting').length);
          setInServiceCount(queueData.filter(q => q.status === 'in_service').length);
          setCompletedCount(queueData.filter(q => q.status === 'completed').length);
        }

        // Load patient count — catch RLS errors gracefully
        const { count, error: patientErr } = await supabase
          .from('patient_profiles')
          .select('id', { count: 'exact', head: true });

        if (!patientErr && count !== null) {
          setTotalPatients(count);
        }

        // Load recent audit logs — just action + timestamp, no join
        const { data: auditData, error: auditErr } = await supabase
          .from('audit_logs')
          .select('id, action, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!auditErr && auditData) {
          setRecentActivity(auditData);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isClinician = ['doctor', 'dentist', 'nurse'].some(r => roles.includes(r));
  const isAdmin = ['super_admin', 'admin'].some(r => roles.includes(r));
  const isFrontDesk = ['clinic_staff', 'receptionist'].some(r => roles.includes(r));

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, {profile.first_name}</h1>
        <p className="text-gray-600">
          {roles.map(r => r.replace('_', ' ')).join(', ') || 'User'} &bull; Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isFrontDesk && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-800">Patients Waiting</h3>
            <p className="text-3xl font-bold text-blue-600">{waitingCount}</p>
            <p className="text-sm text-gray-500 mt-2">Currently in queue</p>
          </div>
        )}

        {isClinician && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-800">In Service</h3>
            <p className="text-3xl font-bold text-green-600">{inServiceCount}</p>
            <p className="text-sm text-gray-500 mt-2">Active consultations</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-800">Completed Today</h3>
          <p className="text-3xl font-bold text-purple-600">{completedCount}</p>
          <p className="text-sm text-gray-500 mt-2">Consultations done</p>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <h3 className="text-lg font-semibold text-gray-800">Total Patients</h3>
            <p className="text-3xl font-bold text-orange-600">{totalPatients}</p>
            <p className="text-sm text-gray-500 mt-2">Registered patients</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="text-gray-500">{activity.action}</span>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(activity.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
