'use client';

import { useEffect, useState } from 'react';
import { fetchPatientPortalData } from './actions';
import { formatDate, getStatusColor } from '@/lib/utils';

export default function PatientPortalPage() {
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    const result = await fetchPatientPortalData();
    if (result.success) {
      setPatient(result.data.patient);
      setEncounters(result.data.encounters);
      setPrescriptions(result.data.prescriptions);
      setQueueEntry(result.data.queueEntry);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading patient portal">
        <div className="spinner"></div>
        <span className="sr-only">Loading patient portal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-heading text-[#0F172A] mb-4">Error Loading Portal</h1>
        <p className="text-body text-[#DC2626]">{error}</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h1 className="text-heading text-[#0F172A] mb-4">Patient Profile Not Found</h1>
        <p className="text-body text-[#64748B]">Please contact the clinic to register as a patient.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-8">My Health Portal</h1>

      {queueEntry && (
        <div className="card mb-6 bg-[#EFF6FF] border-[#BFDBFE]">
          <h2 className="text-subheading text-[#1E40AF] mb-2">Current Queue Status</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-[#1E40AF] tabular-nums">
              #{queueEntry.queue_number}
            </div>
            <div>
              <p className="text-body text-[#1E40AF]">
                {queueEntry.clinic_services?.name}
              </p>
              <span className={`badge ${getStatusColor(queueEntry.status)}`}>
                {queueEntry.status}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="text-subheading text-[#0F172A] mb-4">My Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-small text-[#64748B]">Name</p>
            <p className="font-medium text-[#0F172A]">{patient.first_name} {patient.last_name}</p>
          </div>
          <div>
            <p className="text-small text-[#64748B]">Blood Type</p>
            <p className="font-medium text-[#0F172A]">{patient.blood_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-small text-[#64748B]">Allergies</p>
            <p className="font-medium text-[#0F172A]">{patient.allergies || 'None'}</p>
          </div>
          <div>
            <p className="text-small text-[#64748B]">Emergency Contact</p>
            <p className="font-medium text-[#0F172A]">{patient.emergency_contact_name || 'Not specified'}</p>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-subheading text-[#0F172A] mb-4">Recent Visits</h2>
        {encounters.length === 0 ? (
          <p className="text-body text-[#64748B]">No visits yet</p>
        ) : (
          <div className="space-y-3">
            {encounters.map((encounter) => (
              <div key={encounter.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                <div>
                  <p className="font-medium text-[#0F172A]">{encounter.chief_complaint || 'General Visit'}</p>
                  <p className="text-small text-[#64748B]">{formatDate(encounter.visit_date)}</p>
                </div>
                <span className={`badge ${getStatusColor(encounter.status)}`}>
                  {encounter.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-subheading text-[#0F172A] mb-4">My Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <p className="text-body text-[#64748B]">No prescriptions</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                <div>
                  <p className="font-medium text-[#0F172A]">
                    {prescription.items?.[0]?.medication_name || 'Prescription'}
                  </p>
                  <p className="text-small text-[#64748B]">{formatDate(prescription.prescribed_date)}</p>
                </div>
                <span className={`badge ${getStatusColor(prescription.status)}`}>
                  {prescription.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
