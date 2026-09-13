'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchPatientProfile } from '../actions';
import PageHeader from '@/components/layout/PageHeader';
import PageContainer from '@/components/layout/PageContainer';

type Tab = 'profile' | 'medical' | 'vitals' | 'fbs' | 'dental';

interface PatientData {
  profile: any;
  patientProfile: any;
  medicalRecords: any[];
  vitalSigns: any[];
  fbsRecords: any[];
  dentalRecords: any[];
}

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    const result = await fetchPatientProfile(id);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <div className="spinner"></div>
        <span className="sr-only">Loading patient profile...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageContainer variant="standard">
        <PageHeader
          title="Patient Profile"
          breadcrumbs={[
            { label: 'Patient Records', href: '/records' },
            { label: 'Not Found' },
          ]}
        />
        <div className="alert-error" role="alert">{error || 'Patient not found'}</div>
      </PageContainer>
    );
  }

  const { profile, patientProfile, medicalRecords, vitalSigns, fbsRecords, dentalRecords } = data;
  const isStudent = profile.user_type === 'student';

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'medical', label: 'Medical Records', count: medicalRecords.length },
    { key: 'vitals', label: 'Vitals', count: vitalSigns.length },
    { key: 'fbs', label: 'FBS Records', count: fbsRecords.length },
    { key: 'dental', label: 'Dental Records', count: dentalRecords.length },
  ];

  return (
    <PageContainer variant="wide">
      <PageHeader
        title={`${profile.last_name}, ${profile.first_name}`}
        description={`${profile.user_type?.replace('_', ' ')}${profile.employee_student_id ? ` · ${profile.employee_student_id}` : ''}`}
        breadcrumbs={[
          { label: 'Patient Records', href: '/records' },
          { label: `${profile.last_name}, ${profile.first_name}` },
        ]}
      />

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB] mb-6 -mt-2">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Patient sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#1E40AF] text-[#1E40AF]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]'
              }`}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-[#EFF6FF] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="card">
            <h2 className="text-subheading text-[#0F172A] mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem label="Full Name" value={`${profile.first_name} ${profile.middle_name ? profile.middle_name + ' ' : ''}${profile.last_name}${profile.suffix ? ', ' + profile.suffix : ''}`} />
              <InfoItem label="Email" value={profile.email} />
              <InfoItem label="Contact" value={profile.contact_number} />
              <InfoItem label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : undefined} />
              <InfoItem label="Gender" value={profile.gender} />
              <InfoItem label="Address" value={profile.address} />
            </div>
          </div>

          {/* Patient Profile */}
          <div className="card">
            <h2 className="text-subheading text-[#0F172A] mb-4">Patient Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem label="Patient Type" value={profile.user_type?.replace('_', ' ')} />
              <InfoItem label={isStudent ? 'Student ID' : 'Employee ID'} value={profile.employee_student_id} />
              {isStudent && <InfoItem label="College" value={profile.college} />}
              {isStudent && <InfoItem label="Course" value={profile.course} />}
              {isStudent && <InfoItem label="Year Level" value={profile.year_level} />}
              {!isStudent && <InfoItem label="Department" value={profile.department} />}
              {!isStudent && <InfoItem label="Position" value={profile.position} />}
              <InfoItem label="Blood Type" value={patientProfile?.blood_type} />
              <InfoItem label="Allergies" value={patientProfile?.allergies} />
              <InfoItem label="Emergency Contact" value={patientProfile?.emergency_contact_name} />
              <InfoItem label="Emergency Phone" value={patientProfile?.emergency_contact_phone} />
            </div>
          </div>
        </div>
      )}

      {/* Medical Records Tab */}
      {activeTab === 'medical' && (
        <div className="space-y-4">
          {medicalRecords.length === 0 ? (
            <EmptyState message="No medical records found" />
          ) : (
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <div key={record.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-small text-[#64748B]">{new Date(record.created_at).toLocaleDateString()}</span>
                    <span className={`badge ${record.status === 'finalized' ? 'badge-success' : 'badge-warning'}`}>{record.status}</span>
                  </div>
                  {record.chief_complaint && <InfoRow label="Chief Complaint" value={record.chief_complaint} />}
                  {record.diagnosis && <InfoRow label="Diagnosis" value={record.diagnosis} />}
                  {record.treatment_plan && <InfoRow label="Treatment Plan" value={record.treatment_plan} />}
                  {record.physical_examination && <InfoRow label="Physical Examination" value={record.physical_examination} />}
                  {record.notes && <InfoRow label="Notes" value={record.notes} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vitals Tab */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          {vitalSigns.length === 0 ? (
            <EmptyState message="No vital signs records found" />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">BP</th>
                      <th scope="col">Pulse</th>
                      <th scope="col">Temp</th>
                      <th scope="col">RR</th>
                      <th scope="col">SpO2</th>
                      <th scope="col">Height</th>
                      <th scope="col">Weight</th>
                      <th scope="col">BMI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {vitalSigns.map((v) => (
                      <tr key={v.id}>
                        <td className="text-small">{v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '—'}</td>
                        <td>{v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}</td>
                        <td>{v.pulse_rate ? `${v.pulse_rate} bpm` : '—'}</td>
                        <td>{v.temperature ? `${v.temperature}°C` : '—'}</td>
                        <td>{v.respiratory_rate ? `${v.respiratory_rate}/min` : '—'}</td>
                        <td>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</td>
                        <td>{v.height ? `${v.height} cm` : '—'}</td>
                        <td>{v.weight ? `${v.weight} kg` : '—'}</td>
                        <td>{v.bmi ? v.bmi.toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FBS Tab */}
      {activeTab === 'fbs' && (
        <div className="space-y-4">
          {fbsRecords.length === 0 ? (
            <EmptyState message="No FBS records found" />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">FBS Value</th>
                      <th scope="col">Fasting Hours</th>
                      <th scope="col">Status</th>
                      <th scope="col">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {fbsRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="text-small">{r.test_date ? new Date(r.test_date).toLocaleDateString() : r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                        <td className="font-medium">{r.fbs_value || r.fasting_blood_sugar ? `${r.fbs_value || r.fasting_blood_sugar} mg/dL` : '—'}</td>
                        <td>{r.fasting_hours ? `${r.fasting_hours}h` : '—'}</td>
                        <td>
                          <span className={`badge ${(r.fbs_value || r.fasting_blood_sugar) && (r.fbs_value || r.fasting_blood_sugar) > 126 ? 'badge-danger' : 'badge-success'}`}>
                            {(r.fbs_value || r.fasting_blood_sugar) && (r.fbs_value || r.fasting_blood_sugar) > 126 ? 'High' : 'Normal'}
                          </span>
                        </td>
                        <td className="text-small text-[#64748B]">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dental Records Tab */}
      {activeTab === 'dental' && (
        <div className="space-y-4">
          {dentalRecords.length === 0 ? (
            <EmptyState message="No dental records found" />
          ) : (
            dentalRecords.map((record) => (
              <div key={record.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-small text-[#64748B]">{new Date(record.created_at).toLocaleDateString()}</span>
                  <span className={`badge ${record.status === 'finalized' ? 'badge-success' : 'badge-warning'}`}>{record.status}</span>
                </div>
                {record.chief_complaint && <InfoRow label="Chief Complaint" value={record.chief_complaint} />}
                {record.diagnosis && <InfoRow label="Diagnosis" value={record.diagnosis} />}
                {record.oral_examination && <InfoRow label="Oral Examination" value={record.oral_examination} />}
                {record.treatment_plan && <InfoRow label="Treatment Plan" value={record.treatment_plan} />}
                {record.notes && <InfoRow label="Notes" value={record.notes} />}
              </div>
            ))
          )}
        </div>
      )}
    </PageContainer>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-small text-[#64748B]">{label}</dt>
      <dd className="text-sm font-medium text-[#0F172A] mt-0.5">{value || '—'}</dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <span className="text-small font-medium text-[#64748B]">{label}:</span>
      <p className="text-sm text-[#0F172A] mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-body text-[#64748B]">
      {message}
    </div>
  );
}
