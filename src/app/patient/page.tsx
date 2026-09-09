'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';

export default function PatientPortalPage() {
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get patient profile
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (patientData) {
      setPatient(patientData);

      // Get encounters
      const { data: encountersData } = await supabase
        .from('encounters')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('visit_date', { ascending: false })
        .limit(10);

      setEncounters(encountersData || []);

      // Get prescriptions
      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('prescribed_date', { ascending: false })
        .limit(10);

      setPrescriptions(prescriptionsData || []);

      // Get current queue entry
      const today = new Date().toISOString().split('T')[0];
      const { data: queueData } = await supabase
        .from('queue_entries')
        .select('*, clinic_services(name)')
        .eq('patient_id', patientData.id)
        .eq('queue_date', today)
        .in('status', ['waiting', 'called', 'in_service'])
        .single();

      setQueueEntry(queueData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Patient Profile Not Found</h1>
        <p className="text-gray-600">Please contact the clinic to register as a patient.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Health Portal</h1>

      {/* Current Queue Status */}
      {queueEntry && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Current Queue Status</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600">
              #{queueEntry.queue_number}
            </div>
            <div>
              <p className="text-blue-800">
                {queueEntry.clinic_services?.name}
              </p>
              <span className={`badge ${getStatusColor(queueEntry.status)}`}>
                {queueEntry.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Info */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{patient.first_name} {patient.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Blood Type</p>
            <p className="font-medium">{patient.blood_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Allergies</p>
            <p className="font-medium">{patient.allergies || 'None'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Emergency Contact</p>
            <p className="font-medium">{patient.emergency_contact_name || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Recent Encounters */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Visits</h2>
        {encounters.length === 0 ? (
          <p className="text-gray-500">No visits yet</p>
        ) : (
          <div className="space-y-3">
            {encounters.map((encounter) => (
              <div key={encounter.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium">{encounter.chief_complaint || 'General Visit'}</p>
                  <p className="text-sm text-gray-500">{formatDate(encounter.visit_date)}</p>
                </div>
                <span className={`badge ${getStatusColor(encounter.status)}`}>
                  {encounter.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescriptions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <p className="text-gray-500">No prescriptions</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium">Prescription</p>
                  <p className="text-sm text-gray-500">{formatDate(prescription.prescribed_date)}</p>
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
