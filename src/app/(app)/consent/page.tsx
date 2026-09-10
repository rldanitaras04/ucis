'use client';

import { useState, useEffect } from 'react';
import { fetchConsentRecords, recordConsent, withdrawConsent } from './actions';
import PatientSearch from '@/components/PatientSearch';
import { PatientSearchResult } from '@/app/(app)/actions/patients';
import { Plus, ShieldCheck, ShieldSlash, Calendar } from '@phosphor-icons/react';

const CONSENT_TYPES = [
  { value: 'treatment', label: 'Treatment Consent' },
  { value: 'data_sharing', label: 'Data Sharing Consent' },
  { value: 'research', label: 'Research Consent' },
  { value: 'break_glass', label: 'Break-Glass Access Consent' },
];

export default function ConsentPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [consentType, setConsentType] = useState('treatment');
  const [granted, setGranted] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    setLoading(true);
    const result = await fetchConsentRecords();
    if (result.success) {
      setConsents(result.data);
    }
    setLoading(false);
  };

  const handleRecord = async () => {
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setRecording(true);
    setError(null);

    const result = await recordConsent({
      patient_id: selectedPatient.id,
      consent_type: consentType,
      granted,
      expires_at: expiresAt || undefined,
      notes: notes || undefined,
    });

    if (result.success) {
      setSuccess('Consent recorded successfully');
      setShowRecord(false);
      setSelectedPatient(null);
      setConsentType('treatment');
      setGranted(true);
      setExpiresAt('');
      setNotes('');
      loadConsents();
    } else {
      setError(result.error || 'Failed to record consent');
    }
    setRecording(false);
  };

  const handleWithdraw = async (consentId: string) => {
    if (!confirm('Are you sure you want to withdraw this consent?')) return;

    const result = await withdrawConsent(consentId);
    if (result.success) {
      setSuccess('Consent withdrawn successfully');
      loadConsents();
    } else {
      setError(result.error || 'Failed to withdraw consent');
    }
  };

  const getStatusBadge = (consent: any) => {
    if (!consent.granted) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF2F2] text-[#DC2626]">Withdrawn</span>;
    }
    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">Expired</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669]">Active</span>;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading text-[#0F172A]">Consent Management</h1>
          <p className="text-body text-[#64748B]">Record and manage patient consent</p>
        </div>
        <button onClick={() => setShowRecord(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Record Consent
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="alert">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Record Modal */}
      {showRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-subheading text-[#0F172A]">Record Consent</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Patient *</label>
                <PatientSearch
                  id="consent-patient-search"
                  label="Search Patient"
                  value={selectedPatient?.id || ''}
                  onChange={(id, patient) => patient && setSelectedPatient(patient)}
                  placeholder="Search by name or patient ID..."
                />
              </div>

              <div>
                <label className="label">Consent Type *</label>
                <select
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value)}
                  className="select-field"
                >
                  {CONSENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Status *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={granted === true}
                      onChange={() => setGranted(true)}
                      className="w-4 h-4 text-[#1E40AF]"
                    />
                    <span className="text-sm text-[#111827]">Granted</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={granted === false}
                      onChange={() => setGranted(false)}
                      className="w-4 h-4 text-[#1E40AF]"
                    />
                    <span className="text-sm text-[#111827]">Denied</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Expiration Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex gap-2 justify-end">
              <button onClick={() => setShowRecord(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleRecord} disabled={recording || !selectedPatient} className="btn-primary">
                {recording ? 'Recording...' : 'Record Consent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
          </div>
        ) : consents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#9CA3AF]">No consent records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Patient</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Granted</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Expires</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((consent) => (
                  <tr key={consent.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {consent.patient?.first_name?.charAt(0)}{consent.patient?.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {consent.patient?.last_name}, {consent.patient?.first_name}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{consent.patient?.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B] capitalize">
                      {consent.consent_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(consent)}</td>
                    <td className="py-3 px-4">
                      {consent.granted ? (
                        <ShieldCheck size={18} className="text-[#059669]" />
                      ) : (
                        <ShieldSlash size={18} className="text-[#DC2626]" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">
                      {consent.expires_at ? new Date(consent.expires_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {consent.granted && (
                        <button
                          onClick={() => handleWithdraw(consent.id)}
                          className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium"
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
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
