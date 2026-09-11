'use client';

import { useState, useEffect } from 'react';
import { registerPatient } from '../actions';
import { fetchSystemConfig } from '@/app/(app)/admin/library/actions';
import PatientSearch from '@/components/PatientSearch';
import { PatientSearchResult } from '@/app/(app)/actions/patients';
import Link from 'next/link';

type Step = 'search' | 'register' | 'confirm';

export default function CheckInPage() {
  const [step, setStep] = useState<Step>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string } | null>(null);
  const [patientTypes, setPatientTypes] = useState<{ config_value: string; label: string }[]>([]);

  useEffect(() => {
    fetchSystemConfig('patient_type').then(r => {
      if (r.success) setPatientTypes(r.data);
    });
  }, []);

  const [regData, setRegData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    email: '',
    contact_number: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    university_id: '',
    patient_type: 'student',
    address: '',
  });

  const handlePatientFound = (patientId: string, patient?: PatientSearchResult) => {
    if (patient) {
      setSelectedPatient(patient);
      setStep('confirm');
      setError(null);
    }
  };

  const handleRegisterNew = () => {
    setSelectedPatient(null);
    setStep('register');
    setError(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerPatient({
      first_name: regData.first_name,
      middle_name: regData.middle_name || undefined,
      last_name: regData.last_name,
      suffix: regData.suffix || undefined,
      email: regData.email || undefined,
      contact_number: regData.contact_number || undefined,
      date_of_birth: regData.date_of_birth,
      gender: regData.gender,
      blood_type: regData.blood_type || undefined,
      allergies: regData.allergies || undefined,
      emergency_contact_name: regData.emergency_contact_name || undefined,
      emergency_contact_phone: regData.emergency_contact_phone || undefined,
      university_id: regData.university_id || undefined,
      patient_type: regData.patient_type,
      address: regData.address || undefined,
    });

    if (result.success) {
      setSuccess({ id: result.id });
      setStep('confirm');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'search', label: 'Find Patient' },
    { key: 'register', label: 'Register' },
    { key: 'confirm', label: 'Done' },
  ];

  const visibleSteps = step === 'register'
    ? steps
    : steps.filter(s => s.key !== 'register');

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-heading text-[#0F172A] mb-2">Patient Registration</h1>
      <p className="text-body text-[#64748B] mb-6">Search for an existing patient or register a new one.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {visibleSteps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s.key ? 'bg-[#1E40AF] text-white' :
              visibleSteps.findIndex(vs => vs.key === step) > i ? 'bg-[#059669] text-white' :
              'bg-[#E2E8F0] text-[#64748B]'
            }`}>
              {visibleSteps.findIndex(vs => vs.key === step) > i ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              step === s.key ? 'text-[#1E40AF]' : 'text-[#64748B]'
            }`}>{s.label}</span>
            {i < visibleSteps.length - 1 && <div className="w-8 h-px bg-[#E2E8F0]" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="card space-y-4">
          <h2 className="text-subheading text-[#0F172A]">Find Patient</h2>
          <PatientSearch
            id="checkin-patient-search"
            label="Search Patient"
            value={selectedPatient?.id || ''}
            onChange={handlePatientFound}
            placeholder="Search by name..."
          />
          <div className="text-center">
            <span className="text-small text-[#64748B]">or</span>
          </div>
          <button onClick={handleRegisterNew} className="w-full btn-secondary">
            Register New Patient
          </button>
        </div>
      )}

      {/* Step 2: Register */}
      {step === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="card space-y-4">
          <h2 className="text-subheading text-[#0F172A]">New Patient Registration</h2>

          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="label">First Name *</label>
              <input id="first_name" type="text" required value={regData.first_name} onChange={(e) => setRegData({ ...regData, first_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="last_name" className="label">Last Name *</label>
              <input id="last_name" type="text" required value={regData.last_name} onChange={(e) => setRegData({ ...regData, last_name: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="middle_name" className="label">Middle Name</label>
              <input id="middle_name" type="text" value={regData.middle_name} onChange={(e) => setRegData({ ...regData, middle_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="suffix" className="label">Suffix</label>
              <input id="suffix" type="text" value={regData.suffix} onChange={(e) => setRegData({ ...regData, suffix: e.target.value })} className="input-field" placeholder="Jr., Sr., III, etc." />
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="gender" className="label">Gender *</label>
              <select id="gender" required value={regData.gender} onChange={(e) => setRegData({ ...regData, gender: e.target.value })} className="select-field">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="date_of_birth" className="label">Date of Birth *</label>
              <input id="date_of_birth" type="date" required value={regData.date_of_birth} onChange={(e) => setRegData({ ...regData, date_of_birth: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="blood_type" className="label">Blood Type</label>
              <select id="blood_type" value={regData.blood_type} onChange={(e) => setRegData({ ...regData, blood_type: e.target.value })} className="select-field">
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="contact_number" className="label">Contact Number</label>
              <input id="contact_number" type="tel" value={regData.contact_number} onChange={(e) => setRegData({ ...regData, contact_number: e.target.value })} className="input-field" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="label">Address</label>
            <textarea id="address" rows={2} value={regData.address} onChange={(e) => setRegData({ ...regData, address: e.target.value })} className="input-field" />
          </div>

          {/* Type & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient_type" className="label">Patient Type *</label>
              <select id="patient_type" required value={regData.patient_type} onChange={(e) => setRegData({ ...regData, patient_type: e.target.value })} className="select-field">
                {patientTypes.map(pt => <option key={pt.config_value} value={pt.config_value}>{pt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="university_id" className="label">University/Employee ID</label>
              <input id="university_id" type="text" value={regData.university_id} onChange={(e) => setRegData({ ...regData, university_id: e.target.value })} className="input-field" />
            </div>
          </div>

          {/* Emergency & Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergency_contact_name" className="label">Emergency Contact Name</label>
              <input id="emergency_contact_name" type="text" value={regData.emergency_contact_name} onChange={(e) => setRegData({ ...regData, emergency_contact_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="emergency_contact_phone" className="label">Emergency Contact Phone</label>
              <input id="emergency_contact_phone" type="tel" value={regData.emergency_contact_phone} onChange={(e) => setRegData({ ...regData, emergency_contact_phone: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label htmlFor="allergies" className="label">Allergies</label>
            <textarea id="allergies" rows={2} value={regData.allergies} onChange={(e) => setRegData({ ...regData, allergies: e.target.value })} className="input-field" placeholder="List any known allergies" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
            <button type="button" onClick={() => setStep('search')} className="btn-secondary">Back</button>
          </div>
        </form>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirm' && (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl text-[#059669]">✓</span>
          </div>
          <h2 className="text-subheading text-[#0F172A]">
            {success ? 'Registration Complete' : 'Patient Found'}
          </h2>
          <p className="text-body text-[#64748B]">
            {success
              ? <>Patient <strong>{regData.last_name}, {regData.first_name}</strong> has been registered.</>
              : <>Patient <strong>{selectedPatient?.last_name}, {selectedPatient?.first_name}</strong> is already registered.</>
            }
          </p>
          <div className="flex gap-2 justify-center pt-4">
            <Link href="/queue" className="btn-primary">Go to Queue</Link>
            <button onClick={() => {
              setStep('search');
              setSelectedPatient(null);
              setSuccess(null);
              setError(null);
              setRegData({
                first_name: '', middle_name: '', last_name: '', suffix: '',
                email: '', contact_number: '', date_of_birth: '', gender: '',
                blood_type: '', allergies: '', emergency_contact_name: '',
                emergency_contact_phone: '', university_id: '', patient_type: 'student',
                address: '',
              });
            }} className="btn-secondary">Register Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
