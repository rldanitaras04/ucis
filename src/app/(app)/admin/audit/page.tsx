'use client';

import { useState, useEffect } from 'react';
import { fetchAuditLogs, fetchAuditLogStats, fetchLoginHistory } from './actions';
import {MagnifyingGlass, Clock, StackSimple, Users, Calendar } from '@phosphor-icons/react';

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'login'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [auditResult, statsResult, loginResult] = await Promise.all([
      fetchAuditLogs(),
      fetchAuditLogStats(),
      fetchLoginHistory(),
    ]);

    if (auditResult.success) setAuditLogs(auditResult.data);
    if (statsResult.success) setStats(statsResult.data);
    if (loginResult.success) setLoginHistory(loginResult.data);
    setLoading(false);
  };

  const handleFilter = async () => {
    setLoading(true);
    const result = await fetchAuditLogs(filters);
    if (result.success) setAuditLogs(result.data);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-heading text-[#0F172A]">Audit & Security Logs</h1>
        <p className="text-body text-[#64748B]">System activity and login history</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                <StackSimple size={20} className="text-[#1E40AF]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Today</p>
                <p className="text-lg font-semibold text-[#111827]">{stats.today}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-[#059669]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">This Week</p>
                <p className="text-lg font-semibold text-[#111827]">{stats.thisWeek}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFFBEB] rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-[#D97706]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">This Month</p>
                <p className="text-lg font-semibold text-[#111827]">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F3FF] rounded-lg flex items-center justify-center">
                <Users size={20} className="text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Top Action</p>
                <p className="text-lg font-semibold text-[#111827]">
                  {stats.actionBreakdown?.[0]?.[0] || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F3F4F6] p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'audit' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'login' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          Login History
        </button>
      </div>

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Action</label>
                <input
                  type="text"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  placeholder="e.g., patient.register"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Resource Type</label>
                <input
                  type="text"
                  value={filters.resource_type}
                  onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                  placeholder="e.g., patient_profiles"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleFilter} className="btn-primary flex items-center gap-2">
                <MagnifyingGlass size={16} />
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({ action: '', resource_type: '', start_date: '', end_date: '' });
                  loadData();
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="card">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#9CA3AF]">No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Timestamp</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Actor</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Action</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Resource</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Resource ID</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                        <td className="py-3 px-4 text-sm text-[#64748B]">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#111827] font-mono">
                          {log.actor ? log.actor.substring(0, 8) + '...' : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1E40AF]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#64748B]">
                          {log.resource_type}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#64748B] font-mono">
                          {log.resource_id ? log.resource_id.substring(0, 8) + '...' : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.outcome === 'success' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'
                          }`}>
                            {log.outcome || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === 'login' && (
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9CA3AF]">No login history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">User ID</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Login Time</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">IP Address</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">User Agent</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((login) => (
                    <tr key={login.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="py-3 px-4 text-sm text-[#111827] font-mono">
                        {login.user_id ? login.user_id.substring(0, 8) + '...' : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#64748B]">
                        {formatDate(login.login_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#64748B]">
                        {login.ip_address || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#64748B] max-w-[200px] truncate">
                        {login.user_agent || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          login.logout_at ? 'bg-[#F3F4F6] text-[#6B7280]' : 'bg-[#ECFDF5] text-[#059669]'
                        }`}>
                          {login.logout_at ? 'Ended' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
