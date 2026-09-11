'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPatientsAdmin } from '@/app/(app)/patient/actions';
import Link from 'next/link';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  contact_number?: string;
  gender: string;
  patient_type: string;
  status: string;
  date_of_birth: string;
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadPatients = useCallback(async (query: string) => {
    setLoading(true);
    const result = await fetchPatientsAdmin(query);
    if (result.success) {
      setPatients(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => loadPatients(searchQuery), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery, loadPatients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading patients">
        <div className="spinner"></div>
        <span className="sr-only">Loading patients...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading text-[#0F172A]">Patient Management</h1>
        <Link href="/patient/register" className="btn-primary">
          Register New Patient
        </Link>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">{error}</div>
      )}

      <div className="mb-4">
        <label htmlFor="search" className="sr-only">Search patients</label>
        <input
          id="search"
          type="text"
          placeholder="Search by name..."
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
                <th scope="col">Name</th>
                <th scope="col">Gender</th>
                <th scope="col">DOB</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-medium">{patient.last_name}, {patient.first_name}</td>
                  <td>{patient.gender}</td>
                  <td>{new Date(patient.date_of_birth).toLocaleDateString()}</td>
                  <td>{patient.patient_type}</td>
                  <td>
                    <span className={`badge ${patient.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/patients/${patient.id}`}
                      className="text-sm text-[#2563EB] hover:underline"
                    >
                      Edit
                    </Link>
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
