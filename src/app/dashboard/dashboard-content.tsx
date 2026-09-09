'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
  const [myPrescriptions, setMyPrescriptions] = useState(0);
  const [myFollowUps, setMyFollowUps] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Queue stats
        const { data: queueData, error: queueErr } = await supabase
          .from('queue_entries')
          .select('id, status')
          .eq('queue_date', today);

        if (!queueErr && queueData) {
          setWaitingCount(queueData.filter(q => q.status === 'waiting').length);
          setInServiceCount(queueData.filter(q => q.status === 'in_service').length);
          setCompletedCount(queueData.filter(q => q.status === 'completed').length);
        }

        // Patient count (admin only)
        if (roles.some(r => ['super_admin', 'admin'].includes(r))) {
          const { count, error: patientErr } = await supabase
            .from('patient_profiles')
            .select('id', { count: 'exact', head: true });

          if (!patientErr && count !== null) {
            setTotalPatients(count);
          }
        }

        // My prescriptions count
        const { count: rxCount } = await supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        if (rxCount !== null) {
          setMyPrescriptions(rxCount);
        }

        // My follow-ups count
        const { count: fuCount } = await supabase
          .from('follow_ups')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled');

        if (fuCount !== null) {
          setMyFollowUps(fuCount);
        }

        // Recent audit logs
        const { data: auditData, error: auditErr } = await supabase
          .from('audit_logs')
          .select('id, action, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!auditErr && auditData) {
          setRecentActivity(auditData);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase, roles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dashboard">
        <div className="spinner"></div>
        <span className="sr-only">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-error" role="alert">{error}</div>
      </div>
    );
  }

  const isClinician = ['doctor', 'dentist', 'nurse'].some(r => roles.includes(r));
  const isAdmin = ['super_admin', 'admin'].some(r => roles.includes(r));
  const isFrontDesk = ['clinic_staff', 'receptionist'].some(r => roles.includes(r));
  const isDoctor = roles.includes('doctor');
  const isDentist = roles.includes('dentist');
  const isNurse = roles.includes('nurse');
  const isStudent = roles.includes('student') || roles.includes('faculty') || roles.includes('non_teaching_staff');

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-display text-[#0F172A]">Welcome back, {profile?.first_name || 'User'}</h1>
        <p className="text-body text-[#64748B] mt-1">
          {roles.map(r => r.replace('_', ' ')).join(', ') || 'User'} &bull; Dashboard
        </p>
      </div>

      {/* Queue Stats - Front Desk, Clinicians */}
      {(isFrontDesk || isClinician) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isFrontDesk && (
            <Link href="/queue" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
              <h3 className="text-subheading text-[#0F172A]">Patients Waiting</h3>
              <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{waitingCount}</p>
              <p className="text-small text-[#64748B] mt-2">Currently in queue</p>
            </Link>
          )}
          {isClinician && (
            <Link href="/queue" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
              <h3 className="text-subheading text-[#0F172A]">In Service</h3>
              <p className="text-3xl font-bold text-[#059669] tabular-nums">{inServiceCount}</p>
              <p className="text-small text-[#64748B] mt-2">Active consultations</p>
            </Link>
          )}
          <Link href="/queue" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Completed Today</h3>
            <p className="text-3xl font-bold text-[#2563EB] tabular-nums">{completedCount}</p>
            <p className="text-small text-[#64748B] mt-2">Consultations done</p>
          </Link>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/records" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Total Patients</h3>
            <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{totalPatients}</p>
            <p className="text-small text-[#64748B] mt-2">Registered patients</p>
          </Link>
          <Link href="/queue" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Queue Today</h3>
            <p className="text-3xl font-bold text-[#059669] tabular-nums">{waitingCount + inServiceCount + completedCount}</p>
            <p className="text-small text-[#64748B] mt-2">Total queue entries</p>
          </Link>
          <Link href="/reports" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Reports</h3>
            <p className="text-3xl font-bold text-[#2563EB] tabular-nums">&rarr;</p>
            <p className="text-small text-[#64748B] mt-2">View analytics</p>
          </Link>
          <Link href="/admin/users" className="card border-l-4 border-l-[#D97706] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Users</h3>
            <p className="text-3xl font-bold text-[#D97706] tabular-nums">&rarr;</p>
            <p className="text-small text-[#64748B] mt-2">Manage users</p>
          </Link>
        </div>
      )}

      {/* Student/Faculty Quick Links */}
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/patient" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">My Health Portal</h3>
            <p className="text-small text-[#64748B] mt-2">View records & visits</p>
          </Link>
          <Link href="/prescriptions" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">My Prescriptions</h3>
            <p className="text-3xl font-bold text-[#059669] tabular-nums">{myPrescriptions}</p>
            <p className="text-small text-[#64748B] mt-2">Active prescriptions</p>
          </Link>
          <Link href="/follow-ups" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Follow-ups</h3>
            <p className="text-3xl font-bold text-[#2563EB] tabular-nums">{myFollowUps}</p>
            <p className="text-small text-[#64748B] mt-2">Scheduled</p>
          </Link>
          <Link href="/clearances" className="card border-l-4 border-l-[#D97706] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Clearances</h3>
            <p className="text-small text-[#64748B] mt-2">View status</p>
          </Link>
        </div>
      )}

      {/* Doctor Quick Links */}
      {isDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/queue" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Clinical Queue</h3>
            <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{inServiceCount}</p>
            <p className="text-small text-[#64748B] mt-2">Active consultations</p>
          </Link>
          <Link href="/prescriptions" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Prescriptions</h3>
            <p className="text-small text-[#64748B] mt-2">Manage prescriptions</p>
          </Link>
          <Link href="/referrals" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Referrals</h3>
            <p className="text-small text-[#64748B] mt-2">Manage referrals</p>
          </Link>
          <Link href="/follow-ups" className="card border-l-4 border-l-[#D97706] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Follow-ups</h3>
            <p className="text-small text-[#64748B] mt-2">Schedule follow-ups</p>
          </Link>
        </div>
      )}

      {/* Dentist Quick Links */}
      {isDentist && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/queue" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Dental Queue</h3>
            <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{inServiceCount}</p>
            <p className="text-small text-[#64748B] mt-2">Active consultations</p>
          </Link>
          <Link href="/dental" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Dental Records</h3>
            <p className="text-small text-[#64748B] mt-2">View dental history</p>
          </Link>
          <Link href="/referrals" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Referrals</h3>
            <p className="text-small text-[#64748B] mt-2">Manage referrals</p>
          </Link>
          <Link href="/follow-ups" className="card border-l-4 border-l-[#D97706] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Follow-ups</h3>
            <p className="text-small text-[#64748B] mt-2">Schedule follow-ups</p>
          </Link>
        </div>
      )}

      {/* Nurse Quick Links */}
      {isNurse && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/queue" className="card border-l-4 border-l-[#1E40AF] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Triage Queue</h3>
            <p className="text-3xl font-bold text-[#1E40AF] tabular-nums">{waitingCount}</p>
            <p className="text-small text-[#64748B] mt-2">Patients waiting</p>
          </Link>
          <Link href="/vitals" className="card border-l-4 border-l-[#059669] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Vital Signs</h3>
            <p className="text-small text-[#64748B] mt-2">Record vitals</p>
          </Link>
          <Link href="/fbs" className="card border-l-4 border-l-[#2563EB] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">FBS Records</h3>
            <p className="text-small text-[#64748B] mt-2">Record FBS</p>
          </Link>
          <Link href="/follow-ups" className="card border-l-4 border-l-[#D97706] hover:shadow-md transition-shadow">
            <h3 className="text-subheading text-[#0F172A]">Follow-ups</h3>
            <p className="text-small text-[#64748B] mt-2">View scheduled</p>
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-subheading text-[#0F172A] mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-description">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                <div>
                  <span className="text-body text-[#334155]">{activity.action}</span>
                </div>
                <span className="text-small text-[#94A3B8] tabular-nums">
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
