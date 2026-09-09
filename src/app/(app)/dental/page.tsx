'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchDentalRecords, createDentalRecord, updateDentalRecord, finalizeDentalRecord } from './actions';
import PatientSearch from '@/components/PatientSearch';

interface DentalRecord {
  id: string;
  patient_id: string;
  encounter_id: string;
  chief_complaint?: string;
  oral_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  status: string;
  created_at: string;
  finalized_at?: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
  encounter?: { id: string; visit_date: string; status: string };
}

function DentalPageContent() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DentalRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patient_id: searchParams.get('patient') || '',
    encounter_id: searchParams.get('encounter') || '',
    chief_complaint: '',
    oral_examination: '',
    diagnosis: '',
    treatment_plan: '',
    notes: '',
  });

  const loadRecords = async () => {
    const result = await fetchDentalRecords();
    if (result.success) {
      setRecords(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const resetForm = () => {
    setFormData({
      patient_id: '',
      encounter_id: '',
      chief_complaint: '',
      oral_examination: '',
      diagnosis: '',
      treatment_plan: '',
      notes: '',
    });
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save');
    setError(null);
    setSuccess(null);

    if (editingRecord) {
      const result = await updateDentalRecord(editingRecord.id, {
        chief_complaint: formData.chief_complaint || undefined,
        oral_examination: formData.oral_examination || undefined,
        diagnosis: formData.diagnosis || undefined,
        treatment_plan: formData.treatment_plan || undefined,
        notes: formData.notes || undefined,
      });
      if (result.success) {
        setSuccess('Dental record updated');
        setShowForm(false);
        resetForm();
        await loadRecords();
      } else {
        setError(result.error || 'Failed to update');
      }
    } else {
      if (!formData.patient_id || !formData.encounter_id) {
        setError('Patient and encounter are required');
        setActionLoading(null);
        return;
      }
      const result = await createDentalRecord({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id,
        chief_complaint: formData.chief_complaint || undefined,
        oral_examination: formData.oral_examination || undefined,
        diagnosis: formData.diagnosis || undefined,
        treatment_plan: formData.treatment_plan || undefined,
        notes: formData.notes || undefined,
      });
      if (result.success) {
        setSuccess('Dental record created');
        setShowForm(false);
        resetForm();
        await loadRecords();
      } else {
        setError(result.error || 'Failed to create');
      }
    }
    setActionLoading(null);
  };

  const handleEdit = (record: DentalRecord) => {
    setEditingRecord(record);
    setFormData({
      patient_id: record.patient_id,
      encounter_id: record.encounter_id,
      chief_complaint: record.chief_complaint || '',
      oral_examination: record.oral_examination || '',
      diagnosis: record.diagnosis || '',
      treatment_plan: record.treatment_plan || '',
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  const handleFinalize = async (recordId: string) => {
    setActionLoading(recordId);
    const result = await finalizeDentalRecord(recordId);
    if (result.success) {
      setSuccess('Record finalized');
      await loadRecords();
    } else {
      setError(result.error || 'Failed to finalize');
    }
    setActionLoading(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return 'badge-warning';
      case 'finalized': return 'badge-success';
      case 'amended': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dental records">
        <div className="spinner"></div>
        <span className="sr-only">Loading dental records...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Dental Records</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'New Dental Record'}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Dismiss">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-subheading text-[#0F172A]">
            {editingRecord ? 'Edit Dental Record' : 'New Dental Record'}
          </h2>

          {!editingRecord && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PatientSearch
                id="dental-patient-search"
                label="Patient"
                required
                value={formData.patient_id}
                onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
              />
              <div>
                <label htmlFor="encounter_id" className="label">Encounter ID *</label>
                <input
                  id="encounter_id"
                  type="text"
                  value={formData.encounter_id}
                  onChange={(e) => setFormData({ ...formData, encounter_id: e.target.value })}
                  required
                  className="input-field"
                  placeholder="UUID of active encounter"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="chief_complaint" className="label">Chief Complaint</label>
            <input
              id="chief_complaint"
              type="text"
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              className="input-field"
              placeholder="Patient's main dental concern"
            />
          </div>

          <div>
            <label htmlFor="oral_examination" className="label">Oral Examination</label>
            <textarea
              id="oral_examination"
              value={formData.oral_examination}
              onChange={(e) => setFormData({ ...formData, oral_examination: e.target.value })}
              rows={3}
              className="input-field"
              placeholder="Findings from oral examination"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="diagnosis" className="label">Diagnosis</label>
              <textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                rows={2}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="treatment_plan" className="label">Treatment Plan</label>
              <textarea
                id="treatment_plan"
                value={formData.treatment_plan}
                onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                rows={2}
                className="input-field"
              />
            </div>
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

          <div className="flex gap-2">
            <button type="submit" disabled={actionLoading === 'save'} className="btn-primary">
              {actionLoading === 'save' ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
            </button>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Date</th>
                <th scope="col">Chief Complaint</th>
                <th scope="col">Diagnosis</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    {record.patient?.last_name}, {record.patient?.first_name}
                    <br />
                    <span className="text-small text-[#94A3B8]">{record.patient?.patient_id}</span>
                  </td>
                  <td>{new Date(record.created_at).toLocaleDateString()}</td>
                  <td className="max-w-xs truncate">{record.chief_complaint || 'N/A'}</td>
                  <td className="max-w-xs truncate">{record.diagnosis || 'N/A'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(record.status)}`}>{record.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {record.status === 'draft' && (
                        <>
                          <button onClick={() => handleEdit(record)} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium text-sm">Edit</button>
                          <button onClick={() => handleFinalize(record.id)} disabled={actionLoading === record.id} className="text-[#059669] hover:text-[#047857] font-medium text-sm disabled:opacity-50">Finalize</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No dental records found
          </div>
        )}
      </div>
    </div>
  );
}

export default function DentalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <DentalPageContent />
    </Suspense>
  );
}
