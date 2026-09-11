'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchDashboardStats, fetchInventoryAlerts } from './actions';
import {
  Users,
  Queue,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendUp,
  TrendDown,
  Stethoscope,
  CalendarCheck,
  Bell,
  FileText,
  ChartBar,
  Warning,
} from '@phosphor-icons/react';

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
  const [stats, setStats] = useState({
    waitingCount: 0,
    inServiceCount: 0,
    completedCount: 0,
    totalPatients: 0,
    todayQueue: 0,
  });
  const [inventoryAlerts, setInventoryAlerts] = useState<{
    lowStock: Array<{ medicine_id: string; medicine_name: string; total_stock: number; severity: string }>;
    nearExpiry: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_until_expiry: number; severity: string }>;
    expired: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_expired: number }>;
  }>({ lowStock: [], nearExpiry: [], expired: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsResult, alertsResult] = await Promise.all([
          fetchDashboardStats(),
          fetchInventoryAlerts(),
        ]);
        if (statsResult.success) {
          setStats(statsResult.data);
        }
        if (alertsResult.success) {
          setInventoryAlerts(alertsResult.data);
        }
      } catch {
        // Dashboard load failed silently
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dashboard">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
        <span className="sr-only">Loading dashboard...</span>
      </div>
    );
  }

  const isClinician = ['doctor', 'dentist', 'nurse'].some(r => roles.includes(r));
  const isAdmin = ['super_admin', 'admin'].some(r => roles.includes(r));
  const isFrontDesk = ['clinic_staff'].some(r => roles.includes(r));
  const isStudent = ['student', 'faculty', 'non_teaching_staff'].some(r => roles.includes(r));

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-[#111827]">
            Welcome back, {profile?.first_name || 'User'}
          </h1>
          <span className="px-2 py-0.5 text-xs font-medium bg-[#ECFDF5] text-[#059669] rounded-full">
            Live
          </span>
        </div>
        <p className="text-sm text-[#6B7280]">
          Overview of your clinic performance
        </p>
      </div>

      {/* Admin Stats Grid */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients.toString()}
            change="Registered"
            trend="up"
            icon={<Users size={20} className="text-[#6B7280]" />}
            href="/records"
          />
          <StatCard
            title="Queue Today"
            value={stats.todayQueue.toString()}
            change={`+${stats.todayQueue} today`}
            trend="up"
            icon={<Queue size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="In Service"
            value={stats.inServiceCount.toString()}
            change={`${stats.inServiceCount} active`}
            trend="up"
            icon={<Stethoscope size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Completed"
            value={stats.completedCount.toString()}
            change={`${stats.completedCount} done`}
            trend="up"
            icon={<CheckCircle size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
        </div>
      )}

      {/* Front Desk Stats */}
      {isFrontDesk && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Patients Waiting"
            value={stats.waitingCount.toString()}
            change="In queue"
            trend="up"
            icon={<Clock size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="In Service"
            value={stats.inServiceCount.toString()}
            change="Active"
            trend="up"
            icon={<Stethoscope size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Completed Today"
            value={stats.completedCount.toString()}
            change="Done"
            trend="up"
            icon={<CheckCircle size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Register Patient"
            value="+"
            change="New patient"
            trend="up"
            icon={<Users size={20} className="text-[#6B7280]" />}
            href="/patient/register"
          />
        </div>
      )}

      {/* Clinician Stats */}
      {isClinician && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Waiting"
            value={stats.waitingCount.toString()}
            change="Patients"
            trend="up"
            icon={<Clock size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="In Service"
            value={stats.inServiceCount.toString()}
            change="Active"
            trend="up"
            icon={<Stethoscope size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Completed"
            value={stats.completedCount.toString()}
            change="Today"
            trend="up"
            icon={<CheckCircle size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Follow-ups"
            value="→"
            change="View all"
            trend="up"
            icon={<CalendarCheck size={20} className="text-[#6B7280]" />}
            href="/follow-ups"
          />
        </div>
      )}

      {/* Patient Stats */}
      {isStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="My Health Portal"
            value="→"
            change="View records"
            trend="up"
            icon={<FileText size={20} className="text-[#6B7280]" />}
            href="/patient"
          />
          <StatCard
            title="My Queue"
            value={stats.waitingCount.toString()}
            change="Waiting"
            trend="up"
            icon={<Queue size={20} className="text-[#6B7280]" />}
            href="/queue"
          />
          <StatCard
            title="Prescriptions"
            value="→"
            change="View all"
            trend="up"
            icon={<FileText size={20} className="text-[#6B7280]" />}
            href="/prescriptions"
          />
          <StatCard
            title="Notifications"
            value="→"
            change="View all"
            trend="up"
            icon={<Bell size={20} className="text-[#6B7280]" />}
            href="/notifications"
          />
        </div>
      )}

      {/* Inventory Alerts — visible to admin, nurse, clinic_staff */}
      {(isAdmin || isClinician || isFrontDesk) && (inventoryAlerts.lowStock.length > 0 || inventoryAlerts.nearExpiry.length > 0 || inventoryAlerts.expired.length > 0) && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-[#111827] mb-4">Medicine Inventory Alerts</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Low Stock */}
            {inventoryAlerts.lowStock.length > 0 && (
              <div className="bg-white rounded-xl border border-[#FDE68A] overflow-hidden">
                <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2">
                  <Warning size={16} className="text-[#D97706]" />
                  <span className="text-sm font-semibold text-[#92400E]">Low Stock ({inventoryAlerts.lowStock.length})</span>
                </div>
                <div className="divide-y divide-[#F3F4F6] max-h-48 overflow-y-auto">
                  {inventoryAlerts.lowStock.map((item) => (
                    <div key={item.medicine_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-[#374151]">{item.medicine_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.severity === 'critical' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {item.total_stock} left
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/medicines" className="block px-4 py-2 text-xs text-[#1E40AF] hover:bg-[#F9FAFB] border-t border-[#F3F4F6]">
                  View inventory →
                </Link>
              </div>
            )}

            {/* Near Expiry */}
            {inventoryAlerts.nearExpiry.length > 0 && (
              <div className="bg-white rounded-xl border border-[#FDE68A] overflow-hidden">
                <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2">
                  <Clock size={16} className="text-[#D97706]" />
                  <span className="text-sm font-semibold text-[#92400E]">Expiring Soon ({inventoryAlerts.nearExpiry.length})</span>
                </div>
                <div className="divide-y divide-[#F3F4F6] max-h-48 overflow-y-auto">
                  {inventoryAlerts.nearExpiry.map((item, idx) => (
                    <div key={`${item.medicine_id}-${idx}`} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm text-[#374151]">{item.medicine_name}</span>
                        <span className="text-xs text-[#9CA3AF] ml-1">({item.batch_number})</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.days_until_expiry <= 7 ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {item.days_until_expiry}d left
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/medicines" className="block px-4 py-2 text-xs text-[#1E40AF] hover:bg-[#F9FAFB] border-t border-[#F3F4F6]">
                  View inventory →
                </Link>
              </div>
            )}

            {/* Expired */}
            {inventoryAlerts.expired.length > 0 && (
              <div className="bg-white rounded-xl border border-[#FECACA] overflow-hidden">
                <div className="px-4 py-3 bg-[#FEF2F2] border-b border-[#FECACA] flex items-center gap-2">
                  <Warning size={16} className="text-[#DC2626]" />
                  <span className="text-sm font-semibold text-[#991B1B]">Expired ({inventoryAlerts.expired.length})</span>
                </div>
                <div className="divide-y divide-[#F3F4F6] max-h-48 overflow-y-auto">
                  {inventoryAlerts.expired.map((item, idx) => (
                    <div key={`${item.medicine_id}-${idx}`} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm text-[#374151]">{item.medicine_name}</span>
                        <span className="text-xs text-[#9CA3AF] ml-1">({item.batch_number})</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">
                        {item.days_expired}d ago
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/medicines" className="block px-4 py-2 text-xs text-[#1E40AF] hover:bg-[#F9FAFB] border-t border-[#F3F4F6]">
                  View inventory →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h2 className="text-base font-semibold text-[#111827] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QuickAction href="/queue" icon={<Queue size={20} />} label="Queue" />
            <QuickAction href="/records" icon={<Users size={20} />} label="Patients" />
            <QuickAction href="/prescriptions" icon={<FileText size={20} />} label="Prescriptions" />
            <QuickAction href="/vitals" icon={<Stethoscope size={20} />} label="Vitals" />
            <QuickAction href="/reports" icon={<ChartBar size={20} />} label="Reports" />
            <QuickAction href="/notifications" icon={<Bell size={20} />} label="Alerts" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h2 className="text-base font-semibold text-[#111827] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {stats.completedCount > 0 && (
              <ActivityItem
                icon={<CheckCircle size={16} className="text-[#059669]" />}
                text={`${stats.completedCount} consultations completed`}
                time="Today"
              />
            )}
            {stats.inServiceCount > 0 && (
              <ActivityItem
                icon={<Stethoscope size={16} className="text-[#1E40AF]" />}
                text={`${stats.inServiceCount} patients in service`}
                time="Now"
              />
            )}
            {stats.waitingCount > 0 && (
              <ActivityItem
                icon={<Clock size={16} className="text-[#D97706]" />}
                text={`${stats.waitingCount} patients waiting`}
                time="Queue"
              />
            )}
            {stats.completedCount === 0 && stats.inServiceCount === 0 && stats.waitingCount === 0 && (
              <div className="text-sm text-[#9CA3AF] py-4 text-center">
                No activity today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  href,
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#6B7280]">{title}</span>
        <div className="w-10 h-10 bg-[#F9FAFB] rounded-lg flex items-center justify-center group-hover:bg-[#F3F4F6] transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-[#111827] tabular-nums">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' ? (
              <TrendUp size={14} className="text-[#059669]" />
            ) : (
              <TrendDown size={14} className="text-[#DC2626]" />
            )}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
              {change}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all group"
    >
      <div className="text-[#6B7280] group-hover:text-[#1E40AF] transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-[#374151] group-hover:text-[#111827] transition-colors">
        {label}
      </span>
    </Link>
  );
}

function ActivityItem({
  icon,
  text,
  time,
}: {
  icon: React.ReactNode;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#374151]">{text}</p>
        <p className="text-xs text-[#9CA3AF] mt-0.5">{time}</p>
      </div>
    </div>
  );
}
