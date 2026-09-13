'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlass, X, Plus, Funnel, CaretDown, CaretRight, Pill } from '@phosphor-icons/react';
import { createPrescription, cancelPrescription, fetchPrescriptions, fetchAvailableMedicines } from './actions';
import { fetchPatientName } from '../actions/patients';
import { dispenseMedication, fetchMedicineBatches } from '../dispensing/actions';
import PatientSearch from '@/components/PatientSearch';

interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  form?: string;
  strength?: string;
  category?: string;
}

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  medicine?: Medicine;
  medicine_id?: string;
}

interface Encounter {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  service_name: string | null;
}

interface Prescription {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  status: string;
  prescribed_date: string;
  unit?: string;
  patient?: { id: string; first_name: string; last_name: string; employee_student_id: string | null };
  encounter?: Encounter | null;
  items?: PrescriptionItem[];
}

interface MedicineBatch {
  id: string;
  batch_number: string;
  quantity: number;
  unit_price: number | null;
  expiry_date: string;
  medicine_id: string;
  medicine?: Medicine;
}

interface EncounterGroup {
  encounterId: string | null;
  encounter: Encounter | null;
  patient: Prescription['patient'] | null;
  prescriptions: Prescription[];
  visitDate: string;
}

function PrescriptionsPageContent() {
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

  const patientIdFromQueue = searchParams.get('patient') || '';
  const encounterIdFromQueue = searchParams.get('encounter') || '';
  const fromQueue = !!patientIdFromQueue && !!encounterIdFromQueue;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!patientIdFromQueue);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientNameLoading, setPatientNameLoading] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [dispenseTarget, setDispenseTarget] = useState<string | null>(null);
  const [medicineBatches, setMedicineBatches] = useState<MedicineBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseLoading, setDispenseLoading] = useState(false);

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    (med.generic_name && med.generic_name.toLowerCase().includes(medicineSearch.toLowerCase()))
  );

  const [formData, setFormData] = useState({
    patient_id: searchParams.get('patient') || '',
    encounter_id: searchParams.get('encounter') || '',
    medicine_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    unit: 'piece(s)',
    refills: '0',
    instructions: '',
  });

  const loadPrescriptions = async () => {
    const result = await fetchPrescriptions();
    if (result.success) {
      setPrescriptions(result.data);
    } else {
      setError(result.error);
    }
  };

  const loadMedicines = async () => {
    const result = await fetchAvailableMedicines();
    if (result.success) setMedicines(result.data);
  };

  useEffect(() => {
    loadPrescriptions();
    loadMedicines();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (fromQueue && patientIdFromQueue) {
      setPatientNameLoading(true);
      fetchPatientName(patientIdFromQueue).then((result) => {
        if (result.success) setPatientName(`${result.data.last_name}, ${result.data.first_name}`);
        setPatientNameLoading(false);
      });
    }
  }, [fromQueue, patientIdFromQueue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    setError(null);
    setSuccess(null);
    const result = await createPrescription({
      patient_id: formData.patient_id,
      encounter_id: formData.encounter_id || undefined,
      medicine_id: formData.medicine_id || undefined,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      duration: formData.duration || undefined,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
      unit: formData.unit || undefined,
      refills: formData.refills ? Number(formData.refills) : undefined,
      instructions: formData.instructions || undefined,
    });
    if (result.success) {
      setSuccess('Prescription created successfully');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', medicine_id: '', medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', unit: 'piece(s)', refills: '0', instructions: '' });
      await loadPrescriptions();
    } else {
      setError(result.error || 'Failed to create prescription');
    }
    setActionLoading(null);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    const result = await cancelPrescription(id);
    if (result.success) {
      await loadPrescriptions();
    } else {
      setError(result.error || 'Failed to cancel prescription');
    }
    setActionLoading(null);
  };

  const openDispense = async (prescriptionItemId: string) => {
    setDispenseTarget(prescriptionItemId);
    setSelectedBatch('');
    setDispenseQty(1);
    const result = await fetchMedicineBatches();
    if (result.success) setMedicineBatches(result.data);
  };

  const handleDispense = async () => {
    if (!dispenseTarget || !selectedBatch) return;
    setDispenseLoading(true);
    setError(null);
    const batch = medicineBatches.find(b => b.id === selectedBatch);
    const qty = batch && dispenseQty > batch.quantity ? batch.quantity : dispenseQty;
    const result = await dispenseMedication({
      prescription_item_id: dispenseTarget,
      medicine_batch_id: selectedBatch,
      quantity: qty,
    });
    if (result.success) {
      if (batch && dispenseQty > batch.quantity) {
        setSuccess(`Dispensed ${qty} (partial — batch only had ${batch.quantity})`);
      } else {
        setSuccess('Medication dispensed successfully');
      }
      setDispenseTarget(null);
      await loadPrescriptions();
    } else {
      setError(result.error || 'Failed to dispense');
    }
    setDispenseLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'dispensed': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      case 'expired': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(rx => {
      if (filterStatus && rx.status !== filterStatus) return false;
      if (filterPatient) {
        const q = filterPatient.toLowerCase();
        const name = rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}`.toLowerCase() : '';
        const id = rx.patient?.employee_student_id?.toLowerCase() || '';
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      if (filterDateFrom || filterDateTo) {
        const d = new Date(rx.prescribed_date);
        if (filterDateFrom && d < new Date(filterDateFrom)) return false;
        if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [prescriptions, filterStatus, filterPatient, filterDateFrom, filterDateTo]);

  const encounterGroups = useMemo(() => {
    const groupMap = new Map<string, EncounterGroup>();
    const unlinked: EncounterGroup = {
      encounterId: null,
      encounter: null,
      patient: null,
      prescriptions: [],
      visitDate: '',
    };

    for (const rx of filteredPrescriptions) {
      if (rx.encounter_id) {
        if (!groupMap.has(rx.encounter_id)) {
          groupMap.set(rx.encounter_id, {
            encounterId: rx.encounter_id,
            encounter: rx.encounter || null,
            patient: rx.patient || null,
            prescriptions: [],
            visitDate: rx.encounter?.visit_date || rx.prescribed_date,
          });
        }
        groupMap.get(rx.encounter_id)!.prescriptions.push(rx);
      } else {
        unlinked.prescriptions.push(rx);
        if (!unlinked.patient && rx.patient) unlinked.patient = rx.patient;
      }
    }

    const groups = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );
    if (unlinked.prescriptions.length > 0) groups.push(unlinked);
    return groups;
  }, [filteredPrescriptions]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActiveFilters = filterDateFrom || filterDateTo || filterStatus || filterPatient;
  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
    setFilterPatient('');
  };

  const dispenseItem = dispenseTarget
    ? (() => {
        for (const rx of prescriptions) {
          const item = rx.items?.find(i => i.id === dispenseTarget);
          if (item) return { prescription: rx, item };
        }
        return null;
      })()
    : null;

  const getMatchingBatches = (item: PrescriptionItem) => {
    if (item.medicine_id) {
      return medicineBatches.filter(b => b.medicine_id === item.medicine_id);
    }
    return medicineBatches.filter(b =>
      b.medicine?.name?.toLowerCase().includes(item.medication_name.toLowerCase()) ||
      b.medicine?.generic_name?.toLowerCase().includes(item.medication_name.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading prescriptions">
        <div className="spinner" />
        <span className="sr-only">Loading prescriptions...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
            <Pill size={22} className="text-[#1E40AF]" />
          </div>
          <h1 className="text-heading text-[#0F172A]">Prescriptions</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Prescription'}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4 flex items-center gap-2" role="alert">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert-success mb-4 flex items-center gap-2" role="status">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          {formData.encounter_id && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-2 text-sm text-[#1E40AF]">
              Linked to active encounter
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fromQueue ? (
              <div>
                <label className="label">Patient *</label>
                <div className="input-field bg-[#F8FAFC]">
                  {patientNameLoading ? <span className="text-[#94A3B8]">Loading...</span> : <span className="font-medium text-[#0F172A]">{patientName || patientIdFromQueue}</span>}
                  <input type="hidden" value={formData.patient_id} />
                </div>
              </div>
            ) : (
              <PatientSearch id="rx-patient-search" label="Patient" required value={formData.patient_id}
                onChange={(pid, patient) => { setFormData({ ...formData, patient_id: pid }); if (patient) setPatientName(`${patient.last_name}, ${patient.first_name}`); }}
              />
            )}
            <div>
              <label htmlFor="medicine_search" className="label">Medicine *</label>
              <div className="relative">
                <input id="medicine_search" type="text"
                  value={formData.medicine_id ? medicines.find(m => m.id === formData.medicine_id) ? `${medicines.find(m => m.id === formData.medicine_id)!.name}${medicines.find(m => m.id === formData.medicine_id)!.strength ? ' ' + medicines.find(m => m.id === formData.medicine_id)!.strength : ''}` : medicineSearch : medicineSearch}
                  onChange={(e) => { setMedicineSearch(e.target.value); setFormData({ ...formData, medicine_id: '', medication_name: e.target.value }); setShowMedicineDropdown(true); }}
                  onFocus={() => setShowMedicineDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMedicineDropdown(false), 200)}
                  placeholder="Search medicine..." className="input-field" />
                {formData.medicine_id && (
                  <button type="button" onClick={() => { setFormData({ ...formData, medicine_id: '', medication_name: '' }); setMedicineSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">&times;</button>
                )}
                {showMedicineDropdown && medicineSearch && filteredMedicines.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMedicines.map((med) => (
                      <button key={med.id} type="button" onMouseDown={(e) => e.preventDefault()}
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
                          setFormData({
                            ...formData,
                            medicine_id: med.id,
                            medication_name: `${med.name}${med.strength ? ' ' + med.strength : ''}${med.form ? ' (' + med.form + ')' : ''}`,
                            dosage: defaultDosage,
                            unit: defaultUnit,
                            quantity: isSolidForm ? formData.quantity : '1',
                          });
                          setMedicineSearch('');
                          setShowMedicineDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] text-sm border-b border-[#F1F5F9] last:border-0">
                        <span className="font-medium text-[#0F172A]">{med.name}</span>
                        {med.strength && <span className="text-[#64748B] ml-1">{med.strength}</span>}
                        {med.form && <span className="text-[#94A3B8] ml-1">({med.form})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <label className="label text-xs text-[#94A3B8]">Selected: {formData.medication_name || 'None'}</label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dosage" className="label">Dosage *</label>
              <input id="dosage" type="text" value={formData.dosage} onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} required className="input-field" placeholder={
                formData.medicine_id ? (() => {
                  const med = medicines.find(m => m.id === formData.medicine_id);
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
              <label htmlFor="frequency" className="label">Frequency *</label>
              <input id="frequency" type="text" value={formData.frequency} onChange={(e) => {
                const freq = e.target.value;
                const dur = formData.duration;
                const med = medicines.find(m => m.id === formData.medicine_id);
                const isSolidForm = med?.form === 'tablet' || med?.form === 'capsule';
                if (isSolidForm && dur) {
                  const qty = parseFrequency(freq) * parseDurationDays(dur);
                  setFormData({ ...formData, frequency: freq, quantity: String(qty) });
                } else {
                  setFormData({ ...formData, frequency: freq });
                }
              }} required className="input-field" />
            </div>
            <div>
              <label htmlFor="duration" className="label">Duration</label>
              <input id="duration" type="text" value={formData.duration} onChange={(e) => {
                const dur = e.target.value;
                const freq = formData.frequency;
                const med = medicines.find(m => m.id === formData.medicine_id);
                const isSolidForm = med?.form === 'tablet' || med?.form === 'capsule';
                if (isSolidForm && freq) {
                  const qty = parseFrequency(freq) * parseDurationDays(dur);
                  setFormData({ ...formData, duration: dur, quantity: dur ? String(qty) : formData.quantity });
                } else {
                  setFormData({ ...formData, duration: dur });
                }
              }} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="label">Quantity</label>
              <input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="input-field tabular-nums" />
            </div>
            <div>
              <label htmlFor="unit" className="label">Unit</label>
              <select id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="input-field">
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
            <div>
              <label htmlFor="refills" className="label">Refills</label>
              <input id="refills" type="number" value={formData.refills} onChange={(e) => setFormData({ ...formData, refills: e.target.value })} className="input-field tabular-nums" />
            </div>
          </div>
          <div>
            <label htmlFor="instructions" className="label">Instructions</label>
            <textarea id="instructions" value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} rows={2} className="input-field" />
          </div>
          <button type="submit" disabled={actionLoading === 'create'} className="btn-primary">
            {actionLoading === 'create' ? 'Creating...' : 'Create Prescription'}
          </button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder="Search patient name or ID..." value={filterPatient} onChange={e => setFilterPatient(e.target.value)}
            className="input-field pl-10 w-full" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${hasActiveFilters ? 'border-[#1E40AF] text-[#1E40AF]' : ''}`}>
          <Funnel size={14} /> Filters {hasActiveFilters && '(active)'}
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-ghost text-sm text-[#64748B]">Clear</button>
        )}
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4">
          <div>
            <label className="label text-xs">Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label text-xs">Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="dispensed">Dispensed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {encounterGroups.map(group => {
          const groupId = group.encounterId || 'unlinked';
          const isExpanded = expandedGroups.has(groupId);
          return (
            <div key={groupId} className="card overflow-hidden">
              <button onClick={() => toggleGroup(groupId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left">
                {isExpanded ? <CaretDown size={16} className="text-[#64748B] shrink-0" /> : <CaretRight size={16} className="text-[#64748B] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#0F172A]">
                      {group.patient ? `${group.patient.last_name}, ${group.patient.first_name}` : 'Unknown Patient'}
                    </span>
                    {group.patient?.employee_student_id && (
                      <span className="text-xs text-[#94A3B8]">{group.patient.employee_student_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#64748B] mt-0.5">
                    {group.encounter && (
                      <>
                        <span>{new Date(group.visitDate).toLocaleDateString()}</span>
                        {group.encounter.service_name && <span>{group.encounter.service_name}</span>}
                        {group.encounter.chief_complaint && <span className="truncate max-w-[200px]">{group.encounter.chief_complaint}</span>}
                      </>
                    )}
                    {!group.encounter && <span>Unlinked</span>}
                    <span>{group.prescriptions.length} prescription{group.prescriptions.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#E2E8F0]">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Qty</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {group.prescriptions.map(rx =>
                        rx.items?.map(item => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC]">
                            <td className="font-medium">{item.medication_name}</td>
                            <td>{item.dosage}</td>
                            <td>{item.frequency}</td>
                            <td className="tabular-nums">{item.quantity || '—'} {rx.unit || ''}</td>
                            <td className="text-xs text-[#64748B]">{new Date(rx.prescribed_date).toLocaleDateString()}</td>
                            <td><span className={`badge ${getStatusColor(rx.status)}`}>{rx.status}</span></td>
                            <td>
                              {rx.status === 'active' && (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => openDispense(item.id)} className="text-xs text-[#1E40AF] hover:text-[#1D4ED8] font-medium">
                                    Dispense
                                  </button>
                                  <button onClick={() => handleCancel(rx.id)} disabled={actionLoading === rx.id}
                                    className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-medium disabled:opacity-50">
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {encounterGroups.length === 0 && (
          <div className="card text-center py-12 text-[#64748B]">
            <Pill size={48} className="mx-auto text-[#D1D5DB] mb-3" />
            <p>No prescriptions found</p>
          </div>
        )}
      </div>

      {dispenseTarget && dispenseItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-subheading text-[#0F172A]">Dispense Medication</h2>
            <div className="text-sm text-[#64748B]">
              <p><span className="font-medium text-[#0F172A]">{dispenseItem.item.medication_name}</span> — {dispenseItem.item.dosage}</p>
              <p>{dispenseItem.prescription.patient?.last_name}, {dispenseItem.prescription.patient?.first_name}</p>
            </div>
            <div>
              <label className="label">Select Batch *</label>
              <select value={selectedBatch} onChange={e => { setSelectedBatch(e.target.value); setDispenseQty(1); }} className="input-field w-full">
                <option value="">Select batch...</option>
                {getMatchingBatches(dispenseItem.item).map(batch => (
                  <option key={batch.id} value={batch.id} disabled={batch.quantity === 0}>
                    {batch.batch_number} — Qty: {batch.quantity}, Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {getMatchingBatches(dispenseItem.item).length === 0 && (
                <p className="text-xs text-[#DC2626] mt-1">No matching batches found</p>
              )}
            </div>
            {selectedBatch && (
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" max={medicineBatches.find(b => b.id === selectedBatch)?.quantity || 999}
                  value={dispenseQty} onChange={e => setDispenseQty(Number(e.target.value))} className="input-field w-full" />
                {dispenseQty > (medicineBatches.find(b => b.id === selectedBatch)?.quantity || 0) && (
                  <p className="text-xs text-[#D97706] mt-1">Partial dispense: will dispense available quantity only</p>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDispenseTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDispense} disabled={!selectedBatch || dispenseLoading} className="btn-primary">
                {dispenseLoading ? 'Dispensing...' : 'Confirm Dispensing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <PrescriptionsPageContent />
    </Suspense>
  );
}
