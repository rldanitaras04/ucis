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
  Stethoscope,
  FloppyDisk,
  SealCheck,
  Heart,
} from '@phosphor-icons/react';
import { DEFAULT_CLINIC_ID } from '@/lib/config';
import {
  fetchMedicalRecords,
  fetchMedicalRecordDetail,
  fetchClinicsAndPatients,
  createEncounter,
  updateEncounterStatus,
  upsertMedicalRecord,
} from './actions';
import { fetchPatientVitals } from '@/app/(app)/vitals/actions';
import { fetchPatientPrescriptions, createPrescription, deletePrescription, fetchAvailableMedicines } from '@/app/(app)/prescriptions/actions';
import PatientSearch from '@/components/PatientSearch';
import CarinaVitalsAnalysis from '@/components/carina/CarinaVitalsAnalysis';

interface MedicalRecordRow {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  status: string;
  created_at: string;
  patient: { id: string; first_name: string; last_name: string; employee_student_id?: string; user_type?: string; course?: string; year_level?: string; department?: string; position?: string } | null;
  service: { id: string; name: string } | null;
  medical_record: { id: string; chief_complaint: string | null; diagnosis: string | null; treatment_plan: string | null; status: string } | null;
}

interface RecordDetail {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  status: string;
  patient: { id: string; first_name: string; last_name: string; date_of_birth: string; gender: string; blood_type: string; employee_student_id?: string; user_type?: string; course?: string; year_level?: string; department?: string; position?: string } | null;
  service: { id: string; name: string } | null;
  medical_record: {
    id: string; chief_complaint: string | null; history_of_present_illness: string | null;
    physical_examination: string | null; diagnosis: string | null; treatment_plan: string | null;
    notes: string | null; status: string; finalized_at: string | null;
  } | null;
}

function MedicalRecordsPageContent() {
  const searchParams = useSearchParams();

  const parseFrequency = (freq: string): number => {
    const lower = freq.toLowerCase().trim();
    const numMatch = lower.match(/^(\d+)/);
    if (numMatch) return parseInt(numMatch[1], 10);
    if (lower.startsWith('twice') || lower.includes('2x')) return 2;
    if (lower.startsWith('once') || lower.includes('1x')) return 1;
    if (lower.startsWith('three') || lower.includes('3x')) return 3;
    if (lower.startsWith('four') || lower.includes('4x')) return 4;
    return 1;
  };

  const parseDurationDays = (dur: string): number => {
    const lower = dur.toLowerCase().trim();
    const numMatch = lower.match(/^(\d+)/);
    if (!numMatch) return 1;
    const n = parseInt(numMatch[1], 10);
    if (lower.includes('week')) return n * 7;
    if (lower.includes('month')) return n * 30;
    return n;
  };

  const [records, setRecords] = useState<MedicalRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; clinic_id: string }[]>([]);
  const [filteredServices, setFilteredServices] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    patient_id: searchParams.get('patient') || '',
    service_id: '',
    chief_complaint: '',
  });

  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [patientVitals, setPatientVitals] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState({ medicine_id: '', medication_name: '', dosage: '', frequency: '', duration: '', quantity: '1', unit: 'piece(s)', instructions: '' });
  const [rxLoading, setRxLoading] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [showCarinaAnalysis, setShowCarinaAnalysis] = useState(true);
  const [detailTab, setDetailTab] = useState<'vitals' | 'clinical' | 'prescriptions'>('vitals');
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
      setPatients(result.data.patients);
      setServices(result.data.services);
    }
  };

  useEffect(() => {
    if (showCreate) loadCreateData();
  }, [showCreate]);

  useEffect(() => {
    setFilteredServices(services.filter(s => s.clinic_id === DEFAULT_CLINIC_ID));
  }, [services]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const result = await createEncounter({ ...createForm, clinic_id: DEFAULT_CLINIC_ID });
    if (result.success) {
      setSuccess('Encounter created');
      setShowCreate(false);
      setCreateForm({ patient_id: '', service_id: '', chief_complaint: '' });
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
      if (result.data.patient?.id) {
        const vitalsResult = await fetchPatientVitals(result.data.patient.id);
        if (vitalsResult.success) {
          setPatientVitals(vitalsResult.data);
        }
        const rxResult = await fetchPatientPrescriptions(result.data.patient.id);
        if (rxResult.success) {
          setPatientPrescriptions(rxResult.data);
        }
      }
      setShowRxForm(false);
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

  const handleCreatePrescription = async () => {
    if (!selectedRecord?.patient?.id || !rxForm.medication_name || !rxForm.dosage || !rxForm.frequency) return;
    setRxLoading(true);
    const result = await createPrescription({
      patient_id: selectedRecord.patient.id,
      encounter_id: selectedRecord.id,
      medicine_id: rxForm.medicine_id || undefined,
      medication_name: rxForm.medication_name,
      dosage: rxForm.dosage,
      frequency: rxForm.frequency,
      duration: rxForm.duration || undefined,
      quantity: rxForm.quantity ? Number(rxForm.quantity) : undefined,
      unit: rxForm.unit || undefined,
      instructions: rxForm.instructions || undefined,
    });
    if (result.success) {
      setSuccess('Prescription created');
      setShowRxForm(false);
      setRxForm({ medicine_id: '', medication_name: '', dosage: '', frequency: '', duration: '', quantity: '1', unit: 'piece(s)', instructions: '' });
      const rxResult = await fetchPatientPrescriptions(selectedRecord.patient.id);
      if (rxResult.success) setPatientPrescriptions(rxResult.data);
    } else {
      setError(result.error || 'Failed to create prescription');
    }
    setRxLoading(false);
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (!confirm('Delete this prescription?')) return;
    const result = await deletePrescription(prescriptionId);
    if (result.success) {
      setSuccess('Prescription deleted');
      if (selectedRecord?.patient?.id) {
        const rxResult = await fetchPatientPrescriptions(selectedRecord.patient.id);
        if (rxResult.success) setPatientPrescriptions(rxResult.data);
      }
    } else {
      setError(result.error || 'Failed to delete prescription');
    }
  };

  const loadMedicines = async () => {
    const result = await fetchAvailableMedicines();
    if (result.success) setMedicines(result.data);
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    (m.generic_name && m.generic_name.toLowerCase().includes(medicineSearch.toLowerCase()))
  );

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.patient?.first_name?.toLowerCase().includes(q) ||
      r.patient?.last_name?.toLowerCase().includes(q) ||
      r.patient?.employee_student_id?.toLowerCase().includes(q) ||
      r.chief_complaint?.toLowerCase().includes(q) ||
      r.medical_record?.chief_complaint?.toLowerCase().includes(q)
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
                <label htmlFor="service" className="label">Service *</label>
                <select
                  id="service"
                  required
                  value={createForm.service_id}
                  onChange={e => setCreateForm({ ...createForm, service_id: e.target.value })}
                  className="select-field w-full"
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
            placeholder="Search by patient name, ID, or complaint..."
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
                <th scope="col">Details</th>
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
                  <td>
                    <span className="font-medium text-[#0F172A]">{row.patient ? `${row.patient.last_name}, ${row.patient.first_name}` : '—'}</span>
                    <br />
                    <span className="text-small text-[#94A3B8]">{row.patient?.employee_student_id || '—'}</span>
                  </td>
                  <td className="text-small text-[#64748B]">
                    {row.patient && (
                      row.patient.user_type === 'student'
                        ? <>{row.patient.course ? `${row.patient.course} ${row.patient.year_level || ''}`.toUpperCase() : '—'}</>
                        : <>{row.patient.department ? `${row.patient.department} ${row.patient.position || ''}`.toUpperCase() : '—'}</>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate text-[#64748B]">
                    {row.chief_complaint || row.medical_record?.chief_complaint || '—'}
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
                onClick={() => { setSelectedRecord(null); setEditMode(false); setDetailTab('vitals'); }}
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
                    <p className="text-small text-[#64748B]">Student/Employee ID</p>
                    <p className="font-medium text-[#0F172A] font-mono">{selectedRecord.patient?.employee_student_id || '—'}</p>
                  </div>
                  <div>
                    <p className="text-small text-[#64748B]">Course / Department</p>
                    <p className="font-medium text-[#0F172A]">
                      {selectedRecord.patient && (
                        selectedRecord.patient.user_type === 'student'
                          ? <>{selectedRecord.patient.course ? `${selectedRecord.patient.course} ${selectedRecord.patient.year_level || ''}`.toUpperCase() : '—'}</>
                          : <>{selectedRecord.patient.department ? `${selectedRecord.patient.department} ${selectedRecord.patient.position || ''}`.toUpperCase() : '—'}</>
                      )}
                    </p>
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

                <div className="flex border-b border-[#E2E8F0] -mx-6 px-6">
                  {([
                    { key: 'vitals' as const, label: 'Recent Vital Signs', icon: Heart },
                    { key: 'clinical' as const, label: 'Clinical Record', icon: FileText },
                    { key: 'prescriptions' as const, label: 'Prescriptions', icon: FileText },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        detailTab === tab.key
                          ? 'border-[#1E40AF] text-[#1E40AF]'
                          : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailTab === 'vitals' && (
                  <>
                    {patientVitals.length > 0 ? (
                      <div className="border border-[#E2E8F0] rounded-lg p-4">
                        <div className="overflow-x-auto">
                          <table className="table text-xs w-full">
                            <thead>
                              <tr>
                                <th className="text-left">Date</th>
                                <th className="text-left">BP</th>
                                <th className="text-left">HR</th>
                                <th className="text-left">RR</th>
                                <th className="text-left">Temp</th>
                                <th className="text-left">SpO2</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientVitals.map((v: any) => (
                                <tr key={v.id}>
                                  <td>{new Date(v.recorded_at).toLocaleDateString()}</td>
                                  <td className="tabular-nums">{v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}</td>
                                  <td className="tabular-nums">{v.pulse_rate || '—'}</td>
                                  <td className="tabular-nums">{v.respiratory_rate || '—'}</td>
                                  <td className="tabular-nums">{v.temperature ? `${v.temperature}°C` : '—'}</td>
                                  <td className="tabular-nums">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {patientVitals[0] && (
                          <div className="mt-3">
                            <button
                              onClick={() => setShowCarinaAnalysis(!showCarinaAnalysis)}
                              className="text-xs text-[#1E40AF] hover:text-[#1D4ED8] font-medium mb-2"
                            >
                              {showCarinaAnalysis ? 'Hide' : 'Show'} AI Analysis
                            </button>
                            {showCarinaAnalysis && (
                              <CarinaVitalsAnalysis vitals={{
                                blood_pressure_systolic: patientVitals[0].blood_pressure_systolic?.toString() || null,
                                blood_pressure_diastolic: patientVitals[0].blood_pressure_diastolic?.toString() || null,
                                pulse_rate: patientVitals[0].pulse_rate?.toString() || null,
                                respiratory_rate: patientVitals[0].respiratory_rate?.toString() || null,
                                temperature: patientVitals[0].temperature?.toString() || null,
                                oxygen_saturation: patientVitals[0].oxygen_saturation?.toString() || null,
                                height: patientVitals[0].height?.toString() || null,
                                weight: patientVitals[0].weight?.toString() || null,
                              }} />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-small text-[#94A3B8] py-4">No vitals recorded for this encounter.</p>
                    )}
                  </>
                )}

                {detailTab === 'clinical' && (
                  <div className="border border-[#E2E8F0] rounded-lg p-4">
                  <h3 className="text-subheading text-[#0F172A] mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-[#1E40AF]" /> Clinical Record
                  </h3>
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

                {detailTab === 'prescriptions' && (
                <div className="border border-[#E2E8F0] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-subheading text-[#0F172A] flex items-center gap-2">
                      <FileText size={16} className="text-[#1E40AF]" /> Prescriptions
                    </h3>
                    <button onClick={() => { setShowRxForm(!showRxForm); if (!showRxForm) loadMedicines(); }} className="text-sm text-[#1E40AF] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
                      <Plus size={14} /> {showRxForm ? 'Cancel' : 'Add Medicine'}
                    </button>
                  </div>

                  {showRxForm && (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mb-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <label className="label">Medicine *</label>
                          <input
                            type="text"
                            value={rxForm.medicine_id ? medicines.find((m: any) => m.id === rxForm.medicine_id) ? `${medicines.find((m: any) => m.id === rxForm.medicine_id).name}${medicines.find((m: any) => m.id === rxForm.medicine_id).strength ? ' ' + medicines.find((m: any) => m.id === rxForm.medicine_id).strength : ''}` : medicineSearch : medicineSearch}
                            onChange={(e) => { setMedicineSearch(e.target.value); setRxForm({ ...rxForm, medicine_id: '', medication_name: e.target.value }); setShowMedicineDropdown(true); }}
                            onFocus={() => { loadMedicines(); setShowMedicineDropdown(true); }}
                            className="input-field"
                            placeholder="Search medicine..."
                          />
                          {showMedicineDropdown && medicineSearch && (
                            <div className="absolute z-10 w-full bg-white border border-[#E2E8F0] rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {filteredMedicines.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-[#64748B]">No medicines found</div>
                              ) : (
                                filteredMedicines.slice(0, 10).map((med: any) => (
                                  <button
                                    key={med.id}
                                    type="button"
                                    onClick={() => {
                                      const isSolidForm = med.form === 'tablet' || med.form === 'capsule';
                                      const defaultDosage = (() => {
                                        switch (med.form) {
                                          case 'syrup': return '10ml';
                                          case 'ointment': return 'Apply thinly to affected area';
                                          case 'drops': return '2 drops';
                                          case 'inhaler': return '2 puffs';
                                          case 'tablet':
                                          case 'capsule':
                                          case 'injection':
                                            return med.strength || '';
                                          default:
                                            return med.strength || '';
                                        }
                                      })();
                                      const defaultUnit = (() => {
                                        switch (med.form) {
                                          case 'tablet': return 'piece(s)';
                                          case 'capsule': return 'piece(s)';
                                          case 'syrup': return 'bottle(s)';
                                          case 'ointment': return 'tube(s)';
                                          case 'drops': return 'bottle(s)';
                                          case 'inhaler': return 'piece(s)';
                                          case 'injection': return 'vial(s)';
                                          default: return 'piece(s)';
                                        }
                                      })();
                                      setRxForm({
                                        ...rxForm,
                                        medicine_id: med.id,
                                        medication_name: `${med.name}${med.strength ? ' ' + med.strength : ''}`,
                                        dosage: defaultDosage,
                                        unit: defaultUnit,
                                        quantity: isSolidForm ? rxForm.quantity : '1',
                                      });
                                      setMedicineSearch('');
                                      setShowMedicineDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] text-sm"
                                  >
                                    <span className="font-medium">{med.name}</span>
                                    {med.strength && <span className="text-[#64748B] ml-1">{med.strength}</span>}
                                    {med.form && <span className="text-[#94A3B8] ml-1">({med.form})</span>}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="label">Dosage *</label>
                          <input type="text" value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} className="input-field" placeholder={
                            rxForm.medicine_id ? (() => {
                              const med = medicines.find((m: any) => m.id === rxForm.medicine_id);
                              if (!med) return 'e.g. 500mg';
                              switch (med.form) {
                                case 'ointment': return 'e.g. Apply thinly...';
                                case 'syrup': return 'e.g. 10ml';
                                case 'drops': return 'e.g. 2 drops';
                                case 'inhaler': return 'e.g. 2 puffs';
                                default: return 'e.g. 500mg';
                              }
                            })() : 'e.g. 500mg'
                          } />
                        </div>
                        <div>
                          <label className="label">Frequency *</label>
                          <input type="text" value={rxForm.frequency} onChange={e => {
                            const freq = e.target.value;
                            const dur = rxForm.duration;
                            const med = medicines.find((m: any) => m.id === rxForm.medicine_id);
                            const isSolidForm = med?.form === 'tablet' || med?.form === 'capsule';
                            if (isSolidForm && dur) {
                              const qty = parseFrequency(freq) * parseDurationDays(dur);
                              setRxForm({ ...rxForm, frequency: freq, quantity: String(qty) });
                            } else {
                              setRxForm({ ...rxForm, frequency: freq });
                            }
                          }} className="input-field" placeholder="e.g. 3x daily" />
                        </div>
                        <div>
                          <label className="label">Duration</label>
                          <input type="text" value={rxForm.duration} onChange={e => {
                            const dur = e.target.value;
                            const freq = rxForm.frequency;
                            const med = medicines.find((m: any) => m.id === rxForm.medicine_id);
                            const isSolidForm = med?.form === 'tablet' || med?.form === 'capsule';
                            if (isSolidForm && freq) {
                              const qty = parseFrequency(freq) * parseDurationDays(dur);
                              setRxForm({ ...rxForm, duration: dur, quantity: dur ? String(qty) : rxForm.quantity });
                            } else {
                              setRxForm({ ...rxForm, duration: dur });
                            }
                          }} className="input-field" placeholder="e.g. 7 days" />
                        </div>
                        <div>
                          <label className="label">Quantity</label>
                          <input type="number" min="1" value={rxForm.quantity} onChange={e => setRxForm({ ...rxForm, quantity: e.target.value })} className="input-field tabular-nums" placeholder="1" />
                        </div>
                        <div>
                          <label className="label">Unit</label>
                          <select value={rxForm.unit} onChange={e => setRxForm({ ...rxForm, unit: e.target.value })} className="input-field">
                            <option value="piece(s)">piece(s)</option>
                            <option value="tablet(s)">tablet(s)</option>
                            <option value="capsule(s)">capsule(s)</option>
                            <option value="bottle(s)">bottle(s)</option>
                            <option value="tube(s)">tube(s)</option>
                            <option value="vial(s)">vial(s)</option>
                            <option value="ampule(s)">ampule(s)</option>
                            <option value="strip(s)">strip(s)</option>
                            <option value="pack(s)">pack(s)</option>
                            <option value="canister(s)">canister(s)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">Instructions</label>
                        <textarea value={rxForm.instructions} onChange={e => setRxForm({ ...rxForm, instructions: e.target.value })} className="input-field w-full" rows={2} placeholder="Additional instructions..." />
                      </div>
                      <button onClick={handleCreatePrescription} disabled={rxLoading || !rxForm.medication_name || !rxForm.dosage || !rxForm.frequency} className="btn-primary text-sm">
                        {rxLoading ? 'Saving...' : 'Save Prescription'}
                      </button>
                    </div>
                  )}

                  {patientPrescriptions.length === 0 && !showRxForm ? (
                    <p className="text-small text-[#94A3B8]">No prescriptions recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientPrescriptions.map((rx: any) => (
                        <div key={rx.id} className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              {rx.items?.map((item: any) => (
                                <div key={item.id}>
                                  <span className="font-medium text-[#0F172A]">{item.medication_name}</span>
                                  <span className="text-[#64748B] ml-2">{item.dosage} — {item.frequency}</span>
                                  {item.quantity ? <span className="text-[#94A3B8] ml-2">Qty: {item.quantity} {rx.unit || ''}</span> : null}
                                  {item.duration && <span className="text-[#94A3B8] ml-2">({item.duration})</span>}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`badge ${rx.status === 'active' ? 'badge-success' : rx.status === 'cancelled' ? 'badge-error' : 'badge-neutral'}`}>{rx.status}</span>
                              {rx.status === 'active' && (
                                <button onClick={() => handleDeletePrescription(rx.id)} className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium">Delete</button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[#94A3B8] mt-1">{new Date(rx.prescribed_date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
