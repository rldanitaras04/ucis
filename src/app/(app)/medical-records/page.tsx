'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FirstAid,
  Plus,
  X,
  MagnifyingGlass,
  PencilSimple,
  CheckCircle,
  Clock,
  ArrowRight,
  WarningCircle,
  FileText,
  User,
  Buildings,
  Stethoscope,
  FloppyDisk,
  SealCheck,
} from '@phosphor-icons/react';
import {
  fetchMedicalRecords,
  fetchMedicalRecordDetail,
  fetchClinicsAndPatients,
  createEncounter,
  updateEncounterStatus,
  upsertMedicalRecord,
} from './actions';
import PatientSearch from '@/components/PatientSearch';

interface MedicalRecordRow {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  status: string;
  created_at: string;
  patient: { id: string; first_name: string; last_name: string; patient_id: string } | null;
  clinic: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  medical_record: { id: string; diagnosis: string | null; treatment_plan: string | null; status: string } | null;
}

interface RecordDetail {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  status: string;
  patient: { id: string; first_name: string; last_name: string; patient_id: string; date_of_birth: string; sex: string; blood_type: string } | null;
  clinic: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  medical_record: {
    id: string; chief_complaint: string | null; history_of_present_illness: string | null;
    physical_examination: string | null; diagnosis: string | null; treatment_plan: string | null;
    notes: string | null; status: string; finalized_at: string | null;
  } | null;
}

function MedicalRecordsPageContent() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<MedicalRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string; patient_id: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; clinic_id: string }[]>([]);
  const [filteredServices, setFilteredServices] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    patient_id: searchParams.get('patient') || '',
    clinic_id: '',
    service_id: '',
    chief_complaint: '',
  });

  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    chief_complaint: '', history_of_present_illness: '', physical_examination: '',
    diagnosis: '', treatment_plan: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRecords = useCallback(async () => {
    const result = await fetchMedicalRecords();
    if (result.success) {
      setRecords(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const loadCreateData = async () => {
    const result = await fetchClinicsAndPatients();
    if (result.success) {
      setClinics(result.data.clinics);
      setPatients(result.data.patients);
      setServices(result.data.services);
    }
  };

  useEffect(() => {
    if (showCreate) loadCreateData();
  }, [showCreate]);

  useEffect(() => {
    setFilteredServices(createForm.clinic_id ? services.filter(s => s.clinic_id === createForm.clinic_id) : []);
    if (createForm.clinic_id) setCreateForm(prev => ({ ...prev, service_id: '' }));
  }, [createForm.clinic_id, services]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const result = await createEncounter(createForm);
    if (result.success) {
      setSuccess('Encounter created');
      setShowCreate(false);
      setCreateForm({ patient_id: '', clinic_id: '', service_id: '', chief_complaint: '' });
      loadRecords();
    } else {
      setError(result.error);
    }
    setCreating(false);
  };

  const openDetail = async (encounterId: string) => {
    setDetailLoading(true);
    setSelectedRecord(null);
    const result = await fetchMedicalRecordDetail(encounterId);
    if (result.success) {
      setSelectedRecord(result.data);
      if (result.data.medical_record) {
        const mr = result.data.medical_record;
        setEditForm({
          chief_complaint: mr.chief_complaint || '',
          history_of_present_illness: mr.history_of_present_illness || '',
          physical_examination: mr.physical_examination || '',
          diagnosis: mr.diagnosis || '',
          treatment_plan: mr.treatment_plan || '',
          notes: mr.notes || '',
        });
      } else {
        setEditForm({
          chief_complaint: selectedRecord?.chief_complaint || '',
          history_of_present_illness: '', physical_examination: '',
          diagnosis: '', treatment_plan: '', notes: '',
        });
      }
      setEditMode(false);
    } else {
      setError(result.error);
    }
    setDetailLoading(false);
  };

  const handleSaveRecord = async (finalize?: boolean) => {
    if (!selectedRecord) return;
    setSaving(true);
    setError(null);
    const result = await upsertMedicalRecord({
      encounter_id: selectedRecord.id,
      patient_id: selectedRecord.patient!.id,
      ...editForm,
      status: finalize ? 'finalized' : undefined,
    });
    if (result.success) {
      setSuccess(finalize ? 'Record finalized' : 'Record saved');
      await openDetail(selectedRecord.id);
      loadRecords();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleStatusChange = async (encounterId: string, status: string) => {
    const result = await updateEncounterStatus(encounterId, status);
    if (result.success) {
      setSuccess(`Encounter ${status.replace('_', ' ')}`);
      loadRecords();
      if (selectedRecord?.id === encounterId) {
        await openDetail(encounterId);
      }
    } else {
      setError(result.error);
    }
  };

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.patient?.first_name?.toLowerCase().includes(q) ||
      r.patient?.last_name?.toLowerCase().includes(q) ||
      r.patient?.patient_id?.toLowerCase().includes(q) ||
      r.chief_complaint?.toLowerCase().includes(q) ||
      r.clinic?.name?.toLowerCase().includes(q)
    );
  });

  const getEncounterStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'badge-info';
      case 'in_progress': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const getEncounterStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={14} className="text-[#0284C7]" />;
      case 'in_progress': return <ArrowRight size={14} className="text-[#D97706]" />;
      case 'completed': return <CheckCircle size={14} className="text-[#059669]" />;
      case 'cancelled': return <WarningCircle size={14} className="text-[#6B7280]" />;
      default: return null;
    }
  };

  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return 'badge-warning';
      case 'finalized': return 'badge-success';
      case 'amended': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading medical records">
        <div className="spinner"></div>
        <span className="sr-only">Loading medical records...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
            <FirstAid size={22} className="text-[#1E40AF]" />
          </div>
          <h1 className="text-heading text-[#0F172A]">Medical Records</h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'New Encounter'}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4 flex items-center gap-2" role="alert">
          <WarningCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert-success mb-4 flex items-center gap-2" role="status">
          <CheckCircle size={18} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-subheading text-[#0F172A] mb-4 flex items-center gap-2">
            <Plus size={18} className="text-[#1E40AF]" />
            New Encounter
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PatientSearch
                id="mr-patient-search"
                label="Patient"
                required
                value={createForm.patient_id}
                onChange={(patientId) => setCreateForm({ ...createForm, patient_id: patientId })}
              />
              <div>
                <label htmlFor="clinic" className="label">Clinic *</label>
                <select
                  id="clinic"
                  required
                  value={createForm.clinic_id}
                  onChange={e => setCreateForm({ ...createForm, clinic_id: e.target.value })}
                  className="select-field w-full"
                >
                  <option value="">Select clinic...</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="service" className="label">Service *</label>
                <select
                  id="service"
                  required
                  value={createForm.service_id}
                  onChange={e => setCreateForm({ ...createForm, service_id: e.target.value })}
                  className="select-field w-full"
                  disabled={!createForm.clinic_id}
                >
                  <option value="">Select service...</option>
                  {filteredServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="complaint" className="label">Chief Complaint</label>
                <input
                  id="complaint"
                  type="text"
                  value={createForm.chief_complaint}
                  onChange={e => setCreateForm({ ...createForm, chief_complaint: e.target.value })}
                  className="input-field w-full"
                  placeholder="Brief description..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex items-center gap-2">
                <X size={14} /> Cancel
              </button>
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                {creating ? <div className="spinner" /> : <Plus size={14} />}
                {creating ? 'Creating...' : 'Create Encounter'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="search-medical" className="sr-only">Search medical records</label>
        <div className="relative max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            id="search-medical"
            type="text"
            placeholder="Search by patient name, ID, complaint, or clinic..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Patient</th>
                <th scope="col">Clinic</th>
                <th scope="col">Complaint</th>
                <th scope="col">Encounter</th>
                <th scope="col">Record</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredRecords.map(row => (
                <tr key={row.id} className="hover:bg-[#F8FAFC]">
                  <td className="text-small tabular-nums whitespace-nowrap">
                    {new Date(row.visit_date).toLocaleDateString()}
                  </td>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-[#94A3B8]" />
                      {row.patient ? `${row.patient.last_name}, ${row.patient.first_name}` : '—'}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Buildings size={14} className="text-[#94A3B8]" />
                      {row.clinic?.name || '—'}
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate text-[#64748B]">
                    {row.chief_complaint || '—'}
                  </td>
                  <td>
                    <span className={`badge ${getEncounterStatusBadge(row.status)} flex items-center gap-1`}>
                      {getEncounterStatusIcon(row.status)}
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.medical_record ? (
                      <span className={`badge ${getRecordStatusBadge(row.medical_record.status)}`}>
                        {row.medical_record.status}
                      </span>
                    ) : (
                      <span className="text-small text-[#94A3B8]">None</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(row.id)} className="btn-secondary text-xs flex items-center gap-1">
                        <FileText size={12} /> View
                      </button>
                      {row.status === 'open' && (
                        <button onClick={() => handleStatusChange(row.id, 'in_progress')} className="btn-secondary text-xs flex items-center gap-1">
                          <ArrowRight size={12} /> Start
                        </button>
                      )}
                      {row.status === 'in_progress' && (
                        <button onClick={() => handleStatusChange(row.id, 'completed')} className="btn-primary text-xs flex items-center gap-1">
                          <CheckCircle size={12} /> Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <FirstAid size={48} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-body text-[#64748B]">No medical records found</p>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
              <h2 className="text-subheading text-[#0F172A] flex items-center gap-2">
                <Stethoscope size={18} className="text-[#1E40AF]" />
                Encounter Details
              </h2>
              <button
                onClick={() => { setSelectedRecord(null); setEditMode(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#0F172A] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-small text-[#64748B] flex items-center gap-1"><User size={12} /> Patient</p>
                    <p className="font-medium text-[#0F172A]">{selectedRecord.patient?.last_name}, {selectedRecord.patient?.first_name}</p>
                  </div>
                  <div>
                    <p className="text-small text-[#64748B]">Patient ID</p>
                    <p className="font-medium text-[#0F172A] font-mono">{selectedRecord.patient?.patient_id}</p>
                  </div>
                  <div>
                    <p className="text-small text-[#64748B] flex items-center gap-1"><Buildings size={12} /> Clinic</p>
                    <p className="font-medium text-[#0F172A]">{selectedRecord.clinic?.name}</p>
                  </div>
                  <div>
                    <p className="text-small text-[#64748B]">Date</p>
                    <p className="font-medium text-[#0F172A]">{new Date(selectedRecord.visit_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`badge ${getEncounterStatusBadge(selectedRecord.status)} flex items-center gap-1`}>
                    {getEncounterStatusIcon(selectedRecord.status)}
                    {selectedRecord.status}
                  </span>
                  {selectedRecord.medical_record && (
                    <span className={`badge ${getRecordStatusBadge(selectedRecord.medical_record.status)}`}>
                      Record: {selectedRecord.medical_record.status}
                    </span>
                  )}
                </div>

                {!editMode ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-small text-[#64748B] mb-1">Chief Complaint</p>
                      <p className="text-body text-[#0F172A]">{selectedRecord.medical_record?.chief_complaint || selectedRecord.chief_complaint || '—'}</p>
                    </div>
                    <div>
                      <p className="text-small text-[#64748B] mb-1">History of Present Illness</p>
                      <p className="text-body text-[#0F172A] whitespace-pre-wrap">{selectedRecord.medical_record?.history_of_present_illness || '—'}</p>
                    </div>
                    <div>
                      <p className="text-small text-[#64748B] mb-1">Physical Examination</p>
                      <p className="text-body text-[#0F172A] whitespace-pre-wrap">{selectedRecord.medical_record?.physical_examination || '—'}</p>
                    </div>
                    <div>
                      <p className="text-small text-[#64748B] mb-1">Diagnosis</p>
                      <p className="text-body text-[#0F172A] whitespace-pre-wrap">{selectedRecord.medical_record?.diagnosis || '—'}</p>
                    </div>
                    <div>
                      <p className="text-small text-[#64748B] mb-1">Treatment Plan</p>
                      <p className="text-body text-[#0F172A] whitespace-pre-wrap">{selectedRecord.medical_record?.treatment_plan || '—'}</p>
                    </div>
                    <div>
                      <p className="text-small text-[#64748B] mb-1">Notes</p>
                      <p className="text-body text-[#0F172A] whitespace-pre-wrap">{selectedRecord.medical_record?.notes || '—'}</p>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
                      <button onClick={() => setEditMode(true)} className="btn-primary flex items-center gap-2">
                        <PencilSimple size={14} /> Edit Record
                      </button>
                      {selectedRecord.status !== 'completed' && (
                        <button onClick={() => handleStatusChange(selectedRecord.id, 'completed')} className="btn-secondary flex items-center gap-2">
                          <CheckCircle size={14} /> Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-complaint" className="label">Chief Complaint</label>
                      <input id="edit-complaint" type="text" value={editForm.chief_complaint} onChange={e => setEditForm({ ...editForm, chief_complaint: e.target.value })} className="input-field w-full" />
                    </div>
                    <div>
                      <label htmlFor="edit-hpi" className="label">History of Present Illness</label>
                      <textarea id="edit-hpi" value={editForm.history_of_present_illness} onChange={e => setEditForm({ ...editForm, history_of_present_illness: e.target.value })} className="input-field w-full" rows={3} />
                    </div>
                    <div>
                      <label htmlFor="edit-exam" className="label">Physical Examination</label>
                      <textarea id="edit-exam" value={editForm.physical_examination} onChange={e => setEditForm({ ...editForm, physical_examination: e.target.value })} className="input-field w-full" rows={3} />
                    </div>
                    <div>
                      <label htmlFor="edit-diagnosis" className="label">Diagnosis</label>
                      <textarea id="edit-diagnosis" value={editForm.diagnosis} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} className="input-field w-full" rows={2} />
                    </div>
                    <div>
                      <label htmlFor="edit-treatment" className="label">Treatment Plan</label>
                      <textarea id="edit-treatment" value={editForm.treatment_plan} onChange={e => setEditForm({ ...editForm, treatment_plan: e.target.value })} className="input-field w-full" rows={3} />
                    </div>
                    <div>
                      <label htmlFor="edit-notes" className="label">Notes</label>
                      <textarea id="edit-notes" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="input-field w-full" rows={2} />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
                      <button onClick={() => handleSaveRecord(false)} disabled={saving} className="btn-primary flex items-center gap-2">
                        {saving ? <div className="spinner" /> : <FloppyDisk size={14} />}
                        {saving ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button onClick={() => handleSaveRecord(true)} disabled={saving} className="btn-primary bg-[#059669] hover:bg-[#047857] flex items-center gap-2">
                        {saving ? <div className="spinner" /> : <SealCheck size={14} />}
                        {saving ? 'Saving...' : 'Finalize'}
                      </button>
                      <button onClick={() => setEditMode(false)} className="btn-secondary flex items-center gap-2">
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicalRecordsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <MedicalRecordsPageContent />
    </Suspense>
  );
}
