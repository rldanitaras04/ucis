'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPrescription, cancelPrescription, fetchPrescriptions } from './actions';
import PatientSearch from '@/components/PatientSearch';

interface Prescription {
  id: string;
  patient_id: string;
  status: string;
  prescribed_date: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
  items?: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    quantity?: number;
    refills_allowed?: number;
  }>;
}

function PrescriptionsPageContent() {
  const searchParams = useSearchParams();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patient_id: searchParams.get('patient') || '',
    encounter_id: searchParams.get('encounter') || '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
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

  useEffect(() => {
    loadPrescriptions();
    setLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    setError(null);
    setSuccess(null);

    const result = await createPrescription({
      patient_id: formData.patient_id,
      encounter_id: formData.encounter_id || undefined,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      duration: formData.duration || undefined,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
      refills: formData.refills ? Number(formData.refills) : undefined,
      instructions: formData.instructions || undefined,
    });

    if (result.success) {
      setSuccess('Prescription created successfully');
      setShowForm(false);
      setFormData({
        patient_id: '',
        encounter_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        refills: '0',
        instructions: '',
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'dispensed': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      case 'expired': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading prescriptions">
        <div className="spinner"></div>
        <span className="sr-only">Loading prescriptions...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Prescriptions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'New Prescription'}
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
          {formData.encounter_id && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-2 text-sm text-[#1E40AF]">
              Linked to active encounter
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PatientSearch
              id="rx-patient-search"
              label="Patient"
              required
              value={formData.patient_id}
              onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
            />
            <div>
              <label htmlFor="medication_name" className="label">Medication *</label>
              <input
                id="medication_name"
                type="text"
                value={formData.medication_name}
                onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                required
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dosage" className="label">Dosage *</label>
              <input
                id="dosage"
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="frequency" className="label">Frequency *</label>
              <input
                id="frequency"
                type="text"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="duration" className="label">Duration</label>
              <input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="label">Quantity</label>
              <input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input-field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="refills" className="label">Refills</label>
              <input
                id="refills"
                type="number"
                value={formData.refills}
                onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                className="input-field tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="instructions" className="label">Instructions</label>
            <textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={2}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading === 'create'}
            className="btn-primary"
          >
            {actionLoading === 'create' ? 'Creating...' : 'Create Prescription'}
          </button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Medication</th>
                <th scope="col">Dosage</th>
                <th scope="col">Frequency</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {prescriptions.map((rx) =>
                rx.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td>
                      {rx.patient?.last_name}, {rx.patient?.first_name}
                    </td>
                    <td className="font-medium">{item.medication_name}</td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                    <td>
                      <span className={`badge ${getStatusColor(rx.status)}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td>
                      {rx.status === 'active' && (
                        <button
                          onClick={() => handleCancel(rx.id)}
                          disabled={actionLoading === rx.id}
                          className="text-[#DC2626] hover:text-[#B91C1C] font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {prescriptions.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No prescriptions found
          </div>
        )}
      </div>
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
