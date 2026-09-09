'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';

interface MedicalRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  created_by: string;
  chief_complaint?: string;
  diagnosis?: string;
  status: string;
  created_at: string;
  patient_profiles?: {
    first_name: string;
    last_name: string;
  };
}

export default function RecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        patient_profiles(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load records');
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Medical Records</h1>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No records found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Chief Complaint</th>
                  <th>Diagnosis</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.patient_profiles?.first_name} {record.patient_profiles?.last_name}
                    </td>
                    <td>{record.chief_complaint || '-'}</td>
                    <td>{record.diagnosis || '-'}</td>
                    <td>
                      <span className={`badge ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{formatDate(record.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
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

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Medical Record</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <p className="font-medium">
                    {selectedRecord.patient_profiles?.first_name}{' '}
                    {selectedRecord.patient_profiles?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chief Complaint</p>
                  <p>{selectedRecord.chief_complaint || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnosis</p>
                  <p>{selectedRecord.diagnosis || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusColor(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p>{formatDate(selectedRecord.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
