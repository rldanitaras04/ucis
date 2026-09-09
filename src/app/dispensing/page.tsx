'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dispenseMedication } from './actions';

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
  const supabase = createClient();

  const fetchActivePrescriptions = async () => {
    const { data, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .eq('status', 'active')
      .order('prescribed_date', { ascending: false });

    if (fetchError) {
      setError('Failed to fetch prescriptions');
      return;
    }

    setPrescriptions(data || []);
  };

  useEffect(() => {
    fetchActivePrescriptions();
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
      await fetchActivePrescriptions();
    } else {
      setError(result.error || 'Failed to dispense medication');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dispensing</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {prescriptions.map((rx) => (
              <tr key={rx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rx.patient?.last_name}, {rx.patient?.first_name}
                  <br />
                  <span className="text-xs text-gray-500">{rx.patient?.patient_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rx.medication_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rx.dosage}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rx.frequency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {selectedRx === rx.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="Batch #"
                        className="border rounded px-2 py-1 text-sm w-24"
                      />
                      <button
                        onClick={() => handleDispense(rx.id)}
                        disabled={actionLoading === rx.id}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === rx.id ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setSelectedRx(null); setBatchNumber(''); }}
                        className="text-gray-600 hover:text-gray-900 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedRx(rx.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Dispense
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prescriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500">No active prescriptions to dispense</div>
        )}
      </div>
    </div>
  );
}
