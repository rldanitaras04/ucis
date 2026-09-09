'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DentalRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  created_by: string;
  chief_complaint?: string;
  oral_assessment?: string;
  diagnosis?: string;
  treatment_provided?: string;
  treatment_notes?: string;
  follow_up_instructions?: string;
  status: string;
  created_at: string;
  patient_profiles?: { first_name: string; last_name: string };
}

interface Odontogram {
  id: string;
  patient_id: string;
  created_by: string;
  record_date: string;
  notes?: string;
  created_at: string;
}

const TEETH = {
  adult: {
    upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
    upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
    lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
  },
};

const TOOTH_CONDITIONS = [
  { value: 'healthy', label: 'Healthy', color: 'bg-green-100 border-green-300' },
  { value: 'caries', label: 'Caries', color: 'bg-red-100 border-red-300' },
  { value: 'filled', label: 'Filled', color: 'bg-blue-100 border-blue-300' },
  { value: 'crown', label: 'Crown', color: 'bg-yellow-100 border-yellow-300' },
  { value: 'missing', label: 'Missing', color: 'bg-gray-200 border-gray-400' },
  { value: 'extracted', label: 'Extracted', color: 'bg-gray-300 border-gray-500' },
  { value: 'root_canal', label: 'Root Canal', color: 'bg-purple-100 border-purple-300' },
  { value: 'implant', label: 'Implant', color: 'bg-cyan-100 border-cyan-300' },
];

export default function DentalPage() {
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [odontograms, setOdontograms] = useState<Odontogram[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'odontogram'>('records');
  const [selectedRecord, setSelectedRecord] = useState<DentalRecord | null>(null);
  const [toothStates, setToothStates] = useState<Record<number, string>>({});
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [recordsResult, odontogramsResult] = await Promise.all([
      supabase
        .from('dental_records')
        .select('*, patient_profiles(first_name, last_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('odontograms')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(10),
    ]);

    setRecords(recordsResult.data || []);
    setOdontograms(odontogramsResult.data || []);
    setLoading(false);
  };

  const ToothButton = ({ number }: { number: number }) => {
    const state = toothStates[number] || 'healthy';
    const condition = TOOTH_CONDITIONS.find(c => c.value === state);
    return (
      <button
        onClick={() => {
          const currentIndex = TOOTH_CONDITIONS.findIndex(c => c.value === state);
          const nextIndex = (currentIndex + 1) % TOOTH_CONDITIONS.length;
          setToothStates(prev => ({ ...prev, [number]: TOOTH_CONDITIONS[nextIndex].value }));
        }}
        className={`w-10 h-10 border-2 rounded text-xs font-bold ${condition?.color || 'bg-white'}`}
        title={`Tooth ${number} - ${condition?.label}`}
      >
        {number}
      </button>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dental Records</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'records' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Dental Records
        </button>
        <button
          onClick={() => setActiveTab('odontogram')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'odontogram' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Odontogram
        </button>
      </div>

      {activeTab === 'records' && (
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No dental records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Chief Complaint</th>
                    <th>Diagnosis</th>
                    <th>Treatment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.patient_profiles?.first_name} {record.patient_profiles?.last_name}</td>
                      <td>{record.chief_complaint || '-'}</td>
                      <td>{record.diagnosis || '-'}</td>
                      <td>{record.treatment_provided || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{formatDate(record.created_at)}</td>
                      <td>
                        <button onClick={() => setSelectedRecord(record)} className="text-sm text-blue-600 hover:text-blue-800">
                          View
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

      {activeTab === 'odontogram' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interactive Odontogram</h2>
          <p className="text-sm text-gray-500 mb-4">Click teeth to cycle through conditions. Click legend to reset.</p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {TOOTH_CONDITIONS.map((c) => (
              <span key={c.value} className={`text-xs px-2 py-1 rounded border ${c.color}`}>
                {c.label}
              </span>
            ))}
          </div>

          <div className="space-y-2 max-w-lg">
            <div>
              <p className="text-xs text-gray-500 mb-1">Upper Right</p>
              <div className="flex gap-1">
                {TEETH.adult.upperRight.map(t => <ToothButton key={t} number={t} />)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Upper Left</p>
              <div className="flex gap-1">
                {TEETH.adult.upperLeft.map(t => <ToothButton key={t} number={t} />)}
              </div>
            </div>
            <div className="border-t pt-2">
              <p className="text-xs text-gray-500 mb-1">Lower Left</p>
              <div className="flex gap-1">
                {TEETH.adult.lowerLeft.map(t => <ToothButton key={t} number={t} />)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Lower Right</p>
              <div className="flex gap-1">
                {TEETH.adult.lowerRight.map(t => <ToothButton key={t} number={t} />)}
              </div>
            </div>
          </div>

          {odontograms.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-2">Previous Odontograms</h3>
              <div className="space-y-2">
                {odontograms.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium">{formatDate(o.record_date)}</p>
                      {o.notes && <p className="text-xs text-gray-500">{o.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Dental Record</h2>
                <button onClick={() => setSelectedRecord(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <p className="font-medium">{selectedRecord.patient_profiles?.first_name} {selectedRecord.patient_profiles?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chief Complaint</p>
                  <p>{selectedRecord.chief_complaint || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Oral Assessment</p>
                  <p>{selectedRecord.oral_assessment || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnosis</p>
                  <p>{selectedRecord.diagnosis || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Treatment Provided</p>
                  <p>{selectedRecord.treatment_provided || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Treatment Notes</p>
                  <p>{selectedRecord.treatment_notes || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Follow-up Instructions</p>
                  <p>{selectedRecord.follow_up_instructions || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
