'use client';

import { useState, useEffect } from 'react';
import { createReferral, acceptReferral, rejectReferral, fetchClinics, fetchReferrals } from './actions';
import PatientSearch from '@/components/PatientSearch';

interface Referral {
  id: string;
  patient_id: string;
  referral_date: string;
  from_clinic_id?: string;
  to_clinic_id?: string;
  reason: string;
  status: string;
  notes?: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
  from_clinic?: { name: string };
  to_clinic?: { name: string };
}

interface Clinic {
  id: string;
  name: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; action: 'reject' } | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    from_clinic_id: '',
    to_clinic_id: '',
    reason: '',
    notes: '',
  });

  const loadReferrals = async () => {
    const result = await fetchReferrals();
    if (result.success) {
      setReferrals(result.data);
    } else {
      setError(result.error);
    }
  };

  const loadClinics = async () => {
    const result = await fetchClinics();
    if (result.success) {
      setClinics(result.data);
    }
  };

  useEffect(() => {
    Promise.all([loadReferrals(), loadClinics()]).then(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    setError(null);
    setSuccess(null);

    const result = await createReferral({
      patient_id: formData.patient_id,
      from_clinic_id: formData.from_clinic_id,
      to_clinic_id: formData.to_clinic_id,
      reason: formData.reason,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setSuccess('Referral created successfully');
      setShowForm(false);
      setFormData({ patient_id: '', from_clinic_id: '', to_clinic_id: '', reason: '', notes: '' });
      await loadReferrals();
    } else {
      setError(result.error || 'Failed to create referral');
    }
    setActionLoading(null);
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    const result = await acceptReferral(id);
    if (result.success) {
      setSuccess('Referral accepted');
      await loadReferrals();
    } else {
      setError(result.error || 'Failed to accept referral');
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setConfirmDialog({ id, action: 'reject' });
  };

  const confirmReject = async () => {
    if (!confirmDialog) return;
    setActionLoading(confirmDialog.id);
    setConfirmDialog(null);
    const result = await rejectReferral(confirmDialog.id);
    if (result.success) {
      setSuccess('Referral rejected');
      await loadReferrals();
    } else {
      setError(result.error || 'Failed to reject referral');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'accepted': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'rejected': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading referrals">
        <div className="spinner"></div>
        <span className="sr-only">Loading referrals...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Referrals</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Create Referral'}
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
            <PatientSearch
              id="referral-patient-search"
              label="Patient"
              required
              value={formData.patient_id}
              onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
            />
            <div>
              <label htmlFor="from_clinic_id" className="label">From Clinic *</label>
              <select
                id="from_clinic_id"
                value={formData.from_clinic_id}
                onChange={(e) => setFormData({ ...formData, from_clinic_id: e.target.value })}
                required
                className="select-field"
              >
                <option value="">Select clinic</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="to_clinic_id" className="label">To Clinic *</label>
              <select
                id="to_clinic_id"
                value={formData.to_clinic_id}
                onChange={(e) => setFormData({ ...formData, to_clinic_id: e.target.value })}
                required
                className="select-field"
              >
                <option value="">Select clinic</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
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
            {actionLoading === 'create' ? 'Creating...' : 'Create Referral'}
          </button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {referrals.map((referral) => (
                <tr key={referral.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    {referral.patient?.last_name}, {referral.patient?.first_name}
                  </td>
                  <td>{referral.from_clinic?.name || 'N/A'}</td>
                  <td>{referral.to_clinic?.name || 'N/A'}</td>
                  <td className="max-w-xs truncate">{referral.reason}</td>
                  <td>
                    <span className={`badge ${getStatusColor(referral.status)}`}>
                      {referral.status}
                    </span>
                  </td>
                  <td>
                    {new Date(referral.referral_date).toLocaleDateString()}
                  </td>
                  <td>
                    {referral.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(referral.id)}
                          disabled={actionLoading === referral.id}
                          className="btn-secondary text-sm"
                        >
                          {actionLoading === referral.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(referral.id)}
                          disabled={actionLoading === referral.id}
                          className="btn-danger text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrals.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No referrals found
          </div>
        )}
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Confirm Reject</h3>
            <p className="text-[#64748B] mb-6">Are you sure you want to reject this referral?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="btn-danger"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
