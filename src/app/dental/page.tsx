'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DentalRecord {
  id: string;
  patient_id: string;
  encounter_date: string;
  procedures?: string;
  findings?: string;
  treatment_plan?: string;
  notes?: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
}

export default function DentalPage() {
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRecords = async () => {
    const { data, error: fetchError } = await supabase
      .from('encounters')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .eq('encounter_type', 'dental')
      .order('encounter_date', { ascending: false });

    if (fetchError) {
      setError('Failed to fetch dental records');
      return;
    }

    setRecords(data || []);
  };

  useEffect(() => {
    fetchRecords();
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dental Records</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedures</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Findings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.patient?.last_name}, {record.patient?.first_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(record.encounter_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {record.procedures || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {record.findings || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {record.notes || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="text-center py-8 text-gray-500">No dental records found</div>
        )}
      </div>
    </div>
  );
}
