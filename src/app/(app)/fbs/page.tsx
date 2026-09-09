'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { recordFBS, fetchFBSRecords } from './actions';
import PatientSearch from '@/components/PatientSearch';
import { useSearchParams } from 'next/navigation';

interface FBSRecord {
  id: string;
  patient_id: string;
  recorded_at: string;
  fbs_value: number;
  fasting_hours: number | null;
  notes: string | null;
}

function classifyFBS(value: number): { label: string; className: string } {
  if (value < 100) return { label: 'Normal', className: 'badge-success' };
  if (value < 126) return { label: 'Pre-diabetic', className: 'badge-warning' };
  return { label: 'Diabetic', className: 'badge-error' };
}

function FBSPageContent() {
  const searchParams = useSearchParams();
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '');
  const [encounterId] = useState(searchParams.get('encounter') || '');
  const [fbsValue, setFbsValue] = useState('');
  const [fastingHours, setFastingHours] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recentRecords, setRecentRecords] = useState<FBSRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchRecentRecords = useCallback(async () => {
    setRecordsLoading(true);
    const result = await fetchFBSRecords();
    if (result.success) {
      setRecentRecords(result.data);
    }
    setRecordsLoading(false);
  }, []);

  useEffect(() => {
    fetchRecentRecords();
  }, [fetchRecentRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await recordFBS({
      patient_id: patientId,
      encounter_id: encounterId || undefined,
      fbs_value: Number(fbsValue),
      fasting_hours: fastingHours ? Number(fastingHours) : undefined,
      notes: notes || undefined,
    });

    if (result.success) {
      setSuccess(true);
      setFbsValue('');
      setFastingHours('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
      fetchRecentRecords();
    } else {
      setError(result.error || 'Failed to record FBS');
    }
    setLoading(false);
  };

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-heading text-[#0F172A] mb-6">Record FBS</h1>

      {success && (
        <div className="alert-success mb-4" role="status">
          FBS recorded successfully!
        </div>
      )}

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <PatientSearch
          id="fbs-patient-search"
          label="Patient"
          required
          value={patientId}
          onChange={(patientId) => setPatientId(patientId)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fbsValue" className="label">FBS Value (mg/dL) *</label>
            <input
              id="fbsValue"
              type="number"
              step="0.1"
              value={fbsValue}
              onChange={(e) => setFbsValue(e.target.value)}
              required
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="fastingHours" className="label">Fasting Hours</label>
            <input
              id="fastingHours"
              type="number"
              value={fastingHours}
              onChange={(e) => setFastingHours(e.target.value)}
              className="input-field tabular-nums"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Recording...' : 'Record FBS'}
        </button>
      </form>

      <div className="card mt-8">
        <h2 className="text-subheading text-[#0F172A] mb-4">Recent FBS Records</h2>

        {recordsLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-[#64748B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-body text-[#64748B] ml-3">Loading records...</span>
          </div>
        ) : recentRecords.length === 0 ? (
          <p className="text-body text-[#94A3B8] py-8 text-center">No FBS records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-small font-medium text-[#64748B] text-left">Patient ID</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Date</th>
                  <th className="text-small font-medium text-[#64748B] text-left">FBS Value</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Fasting Hrs</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Classification</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((record) => {
                  const classification = classifyFBS(record.fbs_value);
                  return (
                    <tr key={record.id}>
                      <td className="text-body text-[#0F172A]">{record.patient_id}</td>
                      <td className="text-body text-[#334155]">
                        {new Date(record.recorded_at).toLocaleDateString()}
                      </td>
                      <td className="text-body text-[#0F172A] tabular-nums font-medium">
                        {record.fbs_value}
                      </td>
                      <td className="text-body text-[#334155] tabular-nums">
                        {record.fasting_hours != null
                          ? record.fasting_hours
                          : <span className="badge-neutral">N/A</span>}
                      </td>
                      <td>
                        <span className={classification.className}>{classification.label}</span>
                      </td>
                      <td className="text-body text-[#64748B] text-small max-w-[120px] truncate">
                        {record.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FBSPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <FBSPageContent />
    </Suspense>
  );
}
