'use client';

import { useState, useEffect } from 'react';
import { registerPatient, fetchActiveClinics, fetchClinicServices, checkInPatient } from '../actions';
import PatientSearch from '@/components/PatientSearch';
import { PatientSearchResult } from '@/app/(app)/actions/patients';
import Link from 'next/link';

type Step = 'search' | 'register' | 'clinic' | 'confirm';

export default function CheckInPage() {
  const [step, setStep] = useState<Step>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ queueNumber: number } | null>(null);

  const [regData, setRegData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    sex: '',
    blood_type: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    university_id: '',
    user_type: 'student',
  });

  useEffect(() => {
    const loadClinics = async () => {
      const result = await fetchActiveClinics();
      if (result.success) setClinics(result.data);
    };
    loadClinics();
  }, []);

  useEffect(() => {
    if (selectedClinicId) {
      const loadServices = async () => {
        const result = await fetchClinicServices(selectedClinicId);
        if (result.success) setServices(result.data);
        else setServices([]);
      };
      loadServices();
    }
  }, [selectedClinicId]);

  const handlePatientFound = (patientId: string, patient?: PatientSearchResult) => {
    if (patient) {
      setSelectedPatient(patient);
      setStep('clinic');
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
      last_name: regData.last_name,
      email: regData.email || undefined,
      phone: regData.phone || undefined,
      date_of_birth: regData.date_of_birth || undefined,
      sex: regData.sex,
      blood_type: regData.blood_type || undefined,
      allergies: regData.allergies || undefined,
      emergency_contact_name: regData.emergency_contact_name || undefined,
      emergency_contact_phone: regData.emergency_contact_phone || undefined,
      university_id: regData.university_id || undefined,
      user_type: regData.user_type,
    });

    if (result.success) {
      setSelectedPatient({
        id: result.id,
        patient_id: '',
        first_name: regData.first_name,
        last_name: regData.last_name,
        sex: regData.sex,
      });
      setStep('clinic');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedPatient || !selectedClinicId || !selectedServiceId) {
      setError('Please select a clinic and service');
      return;
    }
    setLoading(true);
    setError(null);

    const result = await checkInPatient({
      patient_id: selectedPatient.id,
      clinic_id: selectedClinicId,
      service_id: selectedServiceId,
    });

    if (result.success) {
      setSuccess({ queueNumber: result.queueNumber });
      setStep('confirm');
    } else {
      setError(result.error || 'Check-in failed');
    }
    setLoading(false);
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'search', label: 'Find Patient' },
    { key: 'register', label: 'Register' },
    { key: 'clinic', label: 'Select Clinic' },
    { key: 'confirm', label: 'Confirm' },
  ];

  const visibleSteps = step === 'register'
    ? steps.filter(s => s.key === 'search' || s.key === 'register' || s.key === 'clinic' || s.key === 'confirm')
    : steps.filter(s => s.key !== 'register');

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-heading text-[#0F172A] mb-2">Patient Check-In</h1>
      <p className="text-body text-[#64748B] mb-6">Search for an existing patient or register a new one, then add them to the queue.</p>

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
            placeholder="Search by name or patient ID..."
          />
          <div className="text-center">
            <span className="text-small text-[#64748B]">or</span>
          </div>
          <button onClick={handleRegisterNew} className="w-full btn-secondary">
            Register New Patient
          </button>
        </div>
      )}

      {/* Step 1b: Register */}
      {step === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="card space-y-4">
          <h2 className="text-subheading text-[#0F172A]">New Patient Registration</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sex" className="label">Sex *</label>
              <select id="sex" required value={regData.sex} onChange={(e) => setRegData({ ...regData, sex: e.target.value })} className="select-field">
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="date_of_birth" className="label">Date of Birth</label>
              <input id="date_of_birth" type="date" value={regData.date_of_birth} onChange={(e) => setRegData({ ...regData, date_of_birth: e.target.value })} className="input-field" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <input id="phone" type="tel" value={regData.phone} onChange={(e) => setRegData({ ...regData, phone: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user_type" className="label">Type *</label>
              <select id="user_type" required value={regData.user_type} onChange={(e) => setRegData({ ...regData, user_type: e.target.value })} className="select-field">
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="dependent">Dependent</option>
              </select>
            </div>
            <div>
              <label htmlFor="university_id" className="label">University ID</label>
              <input id="university_id" type="text" value={regData.university_id} onChange={(e) => setRegData({ ...regData, university_id: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registering...' : 'Register & Continue'}
            </button>
            <button type="button" onClick={() => setStep('search')} className="btn-secondary">Back</button>
          </div>
        </form>
      )}

      {/* Step 2: Clinic & Service */}
      {step === 'clinic' && (
        <div className="card space-y-4">
          <h2 className="text-subheading text-[#0F172A]">Select Clinic & Service</h2>

          <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg px-4 py-3 text-sm text-[#0369A1]">
            Patient: <strong>{selectedPatient?.last_name}, {selectedPatient?.first_name}</strong>
            {selectedPatient?.patient_id && <span className="ml-2 text-[#0284C7]">({selectedPatient.patient_id})</span>}
          </div>

          <div>
            <label htmlFor="clinic" className="label">Clinic *</label>
            <select
              id="clinic"
              required
              value={selectedClinicId}
              onChange={(e) => { setSelectedClinicId(e.target.value); setSelectedServiceId(''); }}
              className="select-field"
            >
              <option value="">Select clinic</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="service" className="label">Service *</label>
            <select
              id="service"
              required
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="select-field"
              disabled={!selectedClinicId}
            >
              <option value="">Select service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCheckIn}
              disabled={loading || !selectedClinicId || !selectedServiceId}
              className="btn-primary"
            >
              {loading ? 'Checking in...' : 'Add to Queue'}
            </button>
            <button onClick={() => setStep('search')} className="btn-secondary">Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirm' && success && (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl text-[#059669]">✓</span>
          </div>
          <h2 className="text-subheading text-[#0F172A]">Check-In Complete</h2>
          <p className="text-body text-[#64748B]">
            <strong>{selectedPatient?.last_name}, {selectedPatient?.first_name}</strong> has been added to the queue.
          </p>
          <div className="text-5xl font-bold text-[#1E40AF] tabular-nums my-4">
            #{success.queueNumber}
          </div>
          <p className="text-small text-[#64748B]">Queue Number</p>
          <div className="flex gap-2 justify-center pt-4">
            <Link href="/queue" className="btn-primary">View Queue</Link>
            <button onClick={() => {
              setStep('search');
              setSelectedPatient(null);
              setSelectedClinicId('');
              setSelectedServiceId('');
              setSuccess(null);
              setError(null);
            }} className="btn-secondary">Check In Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
