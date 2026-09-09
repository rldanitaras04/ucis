'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  quantity?: number;
  status: string;
  prescribed_date: string;
  patient_profiles?: { first_name: string; last_name: string };
}

interface DispensingRecord {
  id: string;
  prescription_id: string;
  dispensed_by: string;
  quantity_dispensed: number;
  batch_number?: string;
  dispensed_at: string;
  prescriptions?: { medication_name: string; dosage: string };
  patient_profiles?: { first_name: string; last_name: string };
}

export default function DispensingPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [dispensingHistory, setDispensingHistory] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [quantityDispensed, setQuantityDispensed] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [rxResult, dispResult] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('*, patient_profiles(first_name, last_name)')
        .eq('status', 'active')
        .order('prescribed_date', { ascending: false }),
      supabase
        .from('dispensing')
        .select('*, prescriptions(medication_name, dosage), patient_profiles(first_name, last_name)')
        .order('dispensed_at', { ascending: false })
        .limit(50),
    ]);
    setPrescriptions(rxResult.data || []);
    setDispensingHistory(dispResult.data || []);
    setLoading(false);
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !quantityDispensed) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('dispensing').insert({
        prescription_id: selectedPrescription.id,
        patient_id: selectedPrescription.patient_id,
        dispensed_by: user.id,
        quantity_dispensed: parseInt(quantityDispensed),
        batch_number: batchNumber || null,
        dispensed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      await supabase.from('prescriptions').update({ status: 'dispensed' }).eq('id', selectedPrescription.id);

      toast.success('Dispensed successfully');
      setSelectedPrescription(null);
      setQuantityDispensed('');
      setBatchNumber('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Pharmacy Dispensing</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Pending Prescriptions ({prescriptions.length})
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Dispensing History
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : prescriptions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending prescriptions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Quantity</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td>{rx.patient_profiles?.first_name} {rx.patient_profiles?.last_name}</td>
                      <td className="font-medium">{rx.medication_name}</td>
                      <td>{rx.dosage}</td>
                      <td className="capitalize">{rx.frequency.replace(/_/g, ' ')}</td>
                      <td>{rx.quantity || '-'}</td>
                      <td>{formatDate(rx.prescribed_date)}</td>
                      <td>
                        <button onClick={() => setSelectedPrescription(rx)} className="text-sm text-blue-600 hover:text-blue-800">
                          Dispense
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          {dispensingHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No dispensing history</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Medication</th>
                    <th>Qty Dispensed</th>
                    <th>Batch</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dispensingHistory.map((d) => (
                    <tr key={d.id}>
                      <td>{d.patient_profiles?.first_name} {d.patient_profiles?.last_name}</td>
                      <td>{d.prescriptions?.medication_name}</td>
                      <td>{d.quantity_dispensed}</td>
                      <td>{d.batch_number || '-'}</td>
                      <td>{formatDate(d.dispensed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">Dispense Medication</h2>
            <div className="space-y-3 mb-4">
              <p><span className="text-gray-500">Patient:</span> {selectedPrescription.patient_profiles?.first_name} {selectedPrescription.patient_profiles?.last_name}</p>
              <p><span className="text-gray-500">Medication:</span> {selectedPrescription.medication_name}</p>
              <p><span className="text-gray-500">Dosage:</span> {selectedPrescription.dosage}</p>
              <p><span className="text-gray-500">Prescribed Qty:</span> {selectedPrescription.quantity || 'N/A'}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Quantity to Dispense *</label>
                <input type="number" className="input-field" value={quantityDispensed} onChange={(e) => setQuantityDispensed(e.target.value)} />
              </div>
              <div>
                <label className="label">Batch Number</label>
                <input type="text" className="input-field" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={handleDispense} disabled={submitting || !quantityDispensed} className="btn-primary flex-1">
                {submitting ? 'Dispensing...' : 'Confirm Dispense'}
              </button>
              <button onClick={() => setSelectedPrescription(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
