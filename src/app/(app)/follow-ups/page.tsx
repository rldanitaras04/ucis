'use client';

import { useState, useEffect } from 'react';
import { createFollowUp, completeFollowUp, cancelFollowUp, fetchFollowUps } from './actions';

interface FollowUp {
  id: string;
  patient_id: string;
  scheduled_date: string;
  reason: string;
  status: string;
  notes?: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; action: 'cancel' } | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    reason: '',
    notes: '',
  });

  const loadFollowUps = async () => {
    const result = await fetchFollowUps();
    if (result.success) {
      setFollowUps(result.data);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    loadFollowUps().then(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    setError(null);
    setSuccess(null);

    const result = await createFollowUp({
      patient_id: formData.patient_id,
      scheduled_date: formData.scheduled_date,
      reason: formData.reason,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setSuccess('Follow-up scheduled successfully');
      setShowForm(false);
      setFormData({ patient_id: '', scheduled_date: '', reason: '', notes: '' });
      await loadFollowUps();
    } else {
      setError(result.error || 'Failed to schedule follow-up');
    }
    setActionLoading(null);
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id);
    const result = await completeFollowUp(id);
    if (result.success) {
      setSuccess('Follow-up completed');
      await loadFollowUps();
    } else {
      setError(result.error || 'Failed to complete follow-up');
    }
    setActionLoading(null);
  };

  const handleCancel = async (id: string) => {
    setConfirmDialog({ id, action: 'cancel' });
  };

  const confirmCancel = async () => {
    if (!confirmDialog) return;
    setActionLoading(confirmDialog.id);
    setConfirmDialog(null);
    const result = await cancelFollowUp(confirmDialog.id);
    if (result.success) {
      setSuccess('Follow-up cancelled');
      await loadFollowUps();
    } else {
      setError(result.error || 'Failed to cancel follow-up');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'badge-info';
      case 'completed': return 'badge-success';
      case 'missed': return 'badge-danger';
      case 'cancelled': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading follow-ups">
        <div className="spinner"></div>
        <span className="sr-only">Loading follow-ups...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Follow-ups</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Schedule Follow-up'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient_id" className="label">Patient ID *</label>
              <input
                id="patient_id"
                type="text"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="scheduled_date" className="label">Scheduled Date *</label>
              <input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reason" className="label">Reason *</label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={3}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading === 'create'}
            className="btn-primary"
          >
            {actionLoading === 'create' ? 'Scheduling...' : 'Schedule Follow-up'}
          </button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {followUps.map((fu) => (
                <tr key={fu.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    {fu.patient?.last_name}, {fu.patient?.first_name}
                  </td>
                  <td>
                    {new Date(fu.scheduled_date).toLocaleDateString()}
                  </td>
                  <td className="max-w-xs truncate">{fu.reason}</td>
                  <td>
                    <span className={`badge ${getStatusColor(fu.status)}`}>
                      {fu.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate">
                    {fu.notes || 'N/A'}
                  </td>
                  <td>
                    {fu.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleComplete(fu.id)}
                          disabled={actionLoading === fu.id}
                          className="btn-secondary text-sm"
                        >
                          {actionLoading === fu.id ? 'Processing...' : 'Complete'}
                        </button>
                        <button
                          onClick={() => handleCancel(fu.id)}
                          disabled={actionLoading === fu.id}
                          className="btn-danger text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {followUps.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No follow-ups found
          </div>
        )}
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Confirm Cancel</h3>
            <p className="text-[#64748B] mb-6">Are you sure you want to cancel this follow-up?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancel}
                className="btn-danger"
              >
                Cancel Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
