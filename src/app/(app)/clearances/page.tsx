'use client';

import { useState, useEffect } from 'react';
import { issueClearance, revokeClearance, fetchClearances } from './actions';
import PatientSearch from '@/components/PatientSearch';

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

  const [formData, setFormData] = useState({
    patient_id: '',
    clearance_type: '',
    expiry_date: '',
  });

  const loadClearances = async () => {
    const result = await fetchClearances();
    if (result.success) {
      setClearances(result.data);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    loadClearances();
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
      await loadClearances();
    } else {
      setError(result.error || 'Failed to issue clearance');
    }
    setActionLoading(null);
  };

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    const result = await revokeClearance(id);
    if (result.success) {
      await loadClearances();
    } else {
      setError(result.error || 'Failed to revoke clearance');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'expired': return 'badge-warning';
      case 'revoked': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading clearances">
        <div className="spinner"></div>
        <span className="sr-only">Loading clearances...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Clearances</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Issue Clearance'}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Dismiss error">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PatientSearch
              id="clearance-patient-search"
              label="Patient"
              required
              value={formData.patient_id}
              onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
            />
            <div>
              <label htmlFor="clearance_type" className="label">Clearance Type *</label>
              <select
                id="clearance_type"
                value={formData.clearance_type}
                onChange={(e) => setFormData({ ...formData, clearance_type: e.target.value })}
                required
                className="select-field"
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
              <label htmlFor="expiry_date" className="label">Expiry Date</label>
              <input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading === 'create'}
            className="btn-primary"
          >
            {actionLoading === 'create' ? 'Issuing...' : 'Issue Clearance'}
          </button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Control #</th>
                <th scope="col">Patient</th>
                <th scope="col">Type</th>
                <th scope="col">Issue Date</th>
                <th scope="col">Expiry</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {clearances.map((clr) => (
                <tr key={clr.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-mono tabular-nums">
                    {clr.control_number}
                  </td>
                  <td>
                    {clr.patient?.last_name}, {clr.patient?.first_name}
                  </td>
                  <td>{clr.clearance_type}</td>
                  <td>
                    {new Date(clr.issue_date).toLocaleDateString()}
                  </td>
                  <td>
                    {clr.expiry_date ? new Date(clr.expiry_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusColor(clr.status)}`}>
                      {clr.status}
                    </span>
                  </td>
                  <td>
                    {clr.status === 'active' && (
                      <button
                        onClick={() => handleRevoke(clr.id)}
                        disabled={actionLoading === clr.id}
                        className="text-[#DC2626] hover:text-[#B91C1C] font-medium disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clearances.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No clearances found
          </div>
        )}
      </div>
    </div>
  );
}
