'use client';

import { useState, useEffect } from 'react';
import { dispenseMedication, fetchActivePrescriptions, fetchMedicineBatches } from './actions';

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  quantity: number;
}

interface Prescription {
  id: string;
  patient_id: string;
  status: string;
  prescribed_date: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
  items?: PrescriptionItem[];
}

interface MedicineBatch {
  id: string;
  batch_number: string;
  quantity: number;
  expiration_date: string;
  medicine?: {
    id: string;
    generic_name: string;
    brand_name: string;
    dosage_form: string;
    strength: string;
  };
}

export default function DispensingPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicineBatches, setMedicineBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRxItem, setSelectedRxItem] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [dispenseQuantity, setDispenseQuantity] = useState<number>(1);

  const loadData = async () => {
    const [rxResult, batchResult] = await Promise.all([
      fetchActivePrescriptions(),
      fetchMedicineBatches(),
    ]);
    if (rxResult.success) setPrescriptions(rxResult.data);
    if (batchResult.success) setMedicineBatches(batchResult.data);
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, []);

  const handleDispense = async (prescriptionItemId: string) => {
    if (!selectedBatch) {
      setError('Please select a medicine batch');
      return;
    }

    setActionLoading(prescriptionItemId);
    setError(null);
    setSuccess(null);

    const result = await dispenseMedication({
      prescription_item_id: prescriptionItemId,
      medicine_batch_id: selectedBatch,
      quantity: dispenseQuantity,
    });

    if (result.success) {
      setSuccess('Medication dispensed successfully');
      setSelectedBatch('');
      setSelectedRxItem(null);
      setDispenseQuantity(1);
      await loadData();
    } else {
      setError(result.error || 'Failed to dispense medication');
    }
    setActionLoading(null);
  };

  const getMatchingBatches = (medicationName: string) => {
    return medicineBatches.filter(batch =>
      batch.medicine?.generic_name?.toLowerCase().includes(medicationName.toLowerCase()) ||
      batch.medicine?.brand_name?.toLowerCase().includes(medicationName.toLowerCase())
    );
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
                <th scope="col">Quantity</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {prescriptions.map((rx) =>
                rx.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td>
                      {rx.patient?.last_name}, {rx.patient?.first_name}
                      <br />
                      <span className="text-small text-[#94A3B8]">{rx.patient?.patient_id}</span>
                    </td>
                    <td className="font-medium">{item.medication_name}</td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {selectedRxItem === item.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="input-field w-48 py-1 px-2 text-sm"
                          >
                            <option value="">Select batch</option>
                            {getMatchingBatches(item.medication_name).map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.batch_number} (Qty: {batch.quantity}, Exp: {new Date(batch.expiration_date).toLocaleDateString()})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={dispenseQuantity}
                            onChange={(e) => setDispenseQuantity(Number(e.target.value))}
                            className="input-field w-16 py-1 px-2 text-sm"
                          />
                          <button
                            onClick={() => handleDispense(item.id)}
                            disabled={actionLoading === item.id || !selectedBatch}
                            className="btn-primary py-1 px-3 text-sm"
                          >
                            {actionLoading === item.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => { setSelectedRxItem(null); setSelectedBatch(''); setDispenseQuantity(1); }}
                            className="btn-ghost py-1 px-3 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedRxItem(item.id)}
                          className="btn-primary py-1 px-3 text-sm"
                        >
                          Dispense
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
            No active prescriptions to dispense
          </div>
        )}
      </div>
    </div>
  );
}
