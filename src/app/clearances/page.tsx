'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { issueClearance, revokeClearance } from './actions';

interface Clearance {
  id: string;
  patient_id: string;
  clearance_type: string;
  control_number: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
}

export default function ClearancesPage() {
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    patient_id: '',
    clearance_type: '',
    expiry_date: '',
  });

  const fetchClearances = async () => {
    const { data, error: fetchError } = await supabase
      .from('clearances')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .order('issue_date', { ascending: false });

    if (fetchError) {
      setError('Failed to fetch clearances');
      return;
    }

    setClearances(data || []);
  };

  useEffect(() => {
    fetchClearances();
    setLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    setError(null);
    setSuccess(null);

    const result = await issueClearance({
      patient_id: formData.patient_id,
      clearance_type: formData.clearance_type,
      expiry_date: formData.expiry_date || undefined,
    });

    if (result.success) {
      setSuccess(`Clearance issued. Control #: ${result.controlNumber}`);
      setShowForm(false);
      setFormData({ patient_id: '', clearance_type: '', expiry_date: '' });
      await fetchClearances();
    } else {
      setError(result.error || 'Failed to issue clearance');
    }
    setActionLoading(null);
  };

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    const result = await revokeClearance(id);
    if (result.success) {
      await fetchClearances();
    } else {
      setError(result.error || 'Failed to revoke clearance');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Clearances</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Issue Clearance'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
              <input
                type="text"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clearance Type *</label>
              <select
                value={formData.clearance_type}
                onChange={(e) => setFormData({ ...formData, clearance_type: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select type</option>
                <option value="medical">Medical</option>
                <option value="dental">Dental</option>
                <option value="fitness">Fitness</option>
                <option value="employment">Employment</option>
                <option value="travel">Travel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading === 'create'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'create' ? 'Issuing...' : 'Issue Clearance'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clearances.map((clr) => (
              <tr key={clr.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {clr.control_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {clr.patient?.last_name}, {clr.patient?.first_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {clr.clearance_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(clr.issue_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {clr.expiry_date ? new Date(clr.expiry_date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(clr.status)}`}>
                    {clr.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {clr.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(clr.id)}
                      disabled={actionLoading === clr.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clearances.length === 0 && (
          <div className="text-center py-8 text-gray-500">No clearances found</div>
        )}
      </div>
    </div>
  );
}
