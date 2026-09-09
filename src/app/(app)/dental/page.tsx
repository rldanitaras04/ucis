'use client';

import { useState, useEffect } from 'react';
import { fetchDentalRecords } from './actions';

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

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchDentalRecords();
      if (result.success) {
        setRecords(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dental records">
        <div className="spinner"></div>
        <span className="sr-only">Loading dental records...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">Dental Records</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Date</th>
                <th scope="col">Procedures</th>
                <th scope="col">Findings</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    {record.patient?.last_name}, {record.patient?.first_name}
                  </td>
                  <td>
                    {new Date(record.encounter_date).toLocaleDateString()}
                  </td>
                  <td className="max-w-xs truncate">
                    {record.procedures || 'N/A'}
                  </td>
                  <td className="max-w-xs truncate">
                    {record.findings || 'N/A'}
                  </td>
                  <td className="max-w-xs truncate">
                    {record.notes || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No dental records found
          </div>
        )}
      </div>
    </div>
  );
}
