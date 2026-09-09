'use client';

import { useState, useEffect } from 'react';
import { dispenseMedication, fetchActivePrescriptions } from './actions';

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  status: string;
  prescribed_date: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
}

export default function DispensingPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedRx, setSelectedRx] = useState<string | null>(null);

  const loadPrescriptions = async () => {
    const result = await fetchActivePrescriptions();
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

  const handleDispense = async (prescriptionId: string) => {
    setActionLoading(prescriptionId);
    setError(null);
    setSuccess(null);

    const result = await dispenseMedication({
      prescription_id: prescriptionId,
      quantity_dispensed: 1,
      batch_number: batchNumber || undefined,
    });

    if (result.success) {
      setSuccess('Medication dispensed successfully');
      setBatchNumber('');
      setSelectedRx(null);
      await loadPrescriptions();
    } else {
      setError(result.error || 'Failed to dispense medication');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dispensing">
        <div className="spinner"></div>
        <span className="sr-only">Loading dispensing...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">Dispensing</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">
          {success}
        </div>
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
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    {rx.patient?.last_name}, {rx.patient?.first_name}
                    <br />
                    <span className="text-small text-[#94A3B8]">{rx.patient?.patient_id}</span>
                  </td>
                  <td className="font-medium">{rx.medication_name}</td>
                  <td>{rx.dosage}</td>
                  <td>{rx.frequency}</td>
                  <td>
                    {selectedRx === rx.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          placeholder="Batch #"
                          className="input-field w-24 py-1 px-2 text-sm"
                        />
                        <button
                          onClick={() => handleDispense(rx.id)}
                          disabled={actionLoading === rx.id}
                          className="btn-primary py-1 px-3 text-sm"
                        >
                          {actionLoading === rx.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setSelectedRx(null); setBatchNumber(''); }}
                          className="btn-ghost py-1 px-3 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedRx(rx.id)}
                        className="btn-primary py-1 px-3 text-sm"
                      >
                        Dispense
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prescriptions.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No active prescriptions to dispense
          </div>
        )}
      </div>
    </div>
  );
}
