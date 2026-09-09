'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPatients } from './actions';

interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  sex: string;
  blood_type?: string;
  user_type: string;
  status: string;
  created_at: string;
}

export default function RecordsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadPatients = useCallback(async (query: string) => {
    setLoading(true);
    const result = await fetchPatients(query);
    if (result.success) {
      setPatients(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      loadPatients(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, loadPatients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading records">
        <div className="spinner"></div>
        <span className="sr-only">Loading records...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">Patient Records</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="search" className="sr-only">Search patients</label>
        <input
          id="search"
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Sex</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-mono tabular-nums">
                    {patient.patient_id}
                  </td>
                  <td>
                    {patient.last_name}, {patient.first_name}
                  </td>
                  <td>{patient.sex}</td>
                  <td>{patient.user_type}</td>
                  <td>
                    <span className={`badge ${
                      patient.status === 'active' ? 'badge-success' : 'badge-neutral'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {patients.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No patients found
          </div>
        )}
      </div>
    </div>
  );
}
