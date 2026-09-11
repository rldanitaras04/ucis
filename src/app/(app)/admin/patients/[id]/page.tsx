'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPatientById, updatePatient } from '@/app/(app)/patient/actions';
import { fetchSystemConfig } from '@/app/(app)/admin/library/actions';
import Link from 'next/link';

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [patientTypes, setPatientTypes] = useState<{ config_value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    date_of_birth: '',
    gender: 'male',
    blood_type: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    patient_type: 'student',
    status: 'active',
  });

  useEffect(() => {
    async function load() {
      const [patientResult, typesResult] = await Promise.all([
        fetchPatientById(id),
        fetchSystemConfig('patient_type'),
      ]);
      if (typesResult.success) setPatientTypes(typesResult.data);
      const result = patientResult;
      if (result.success && result.data) {
        const p = result.data;
        setForm({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          contact_number: p.contact_number || '',
          date_of_birth: p.date_of_birth || '',
          gender: p.gender || 'male',
          blood_type: p.blood_type || '',
          allergies: p.allergies || '',
          emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_phone: p.emergency_contact_phone || '',
          patient_type: p.patient_type || 'student',
          status: p.status || 'active',
        });
      } else if (!result.success) {
        setError(result.error || 'Patient not found');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updatePatient(id, {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || undefined,
      contact_number: form.contact_number || undefined,
      date_of_birth: form.date_of_birth || undefined,
      gender: form.gender,
      blood_type: form.blood_type || undefined,
      allergies: form.allergies || undefined,
      emergency_contact_name: form.emergency_contact_name || undefined,
      emergency_contact_phone: form.emergency_contact_phone || undefined,
      patient_type: form.patient_type,
      status: form.status,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading patient">
        <div className="spinner"></div>
        <span className="sr-only">Loading patient...</span>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/patients" className="text-sm text-[#2563EB] hover:underline">
          &larr; Back to Patients
        </Link>
        <h1 className="text-heading text-[#0F172A] mt-2">Edit Patient</h1>
      </div>

      {error && <div className="alert-error mb-4" role="alert">{error}</div>}
      {success && <div className="alert-success mb-4" role="status">Patient updated successfully.</div>}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="label">First Name *</label>
            <input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required className="input-field" />
          </div>
          <div>
            <label htmlFor="last_name" className="label">Last Name *</label>
            <input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label htmlFor="contact_number" className="label">Contact Number</label>
            <input id="contact_number" name="contact_number" value={form.contact_number} onChange={handleChange} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date_of_birth" className="label">Date of Birth</label>
            <input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label htmlFor="gender" className="label">Gender *</label>
            <select id="gender" name="gender" value={form.gender} onChange={handleChange} className="input-field">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="blood_type" className="label">Blood Type</label>
            <select id="blood_type" name="blood_type" value={form.blood_type} onChange={handleChange} className="input-field">
              <option value="">Select</option>
              <option value="A+">A+</option><option value="A-">A-</option>
              <option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option>
              <option value="O+">O+</option><option value="O-">O-</option>
            </select>
          </div>
          <div>
            <label htmlFor="patient_type" className="label">Patient Type *</label>
            <select id="patient_type" name="patient_type" value={form.patient_type} onChange={handleChange} className="input-field">
              {patientTypes.map(pt => <option key={pt.config_value} value={pt.config_value}>{pt.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="allergies" className="label">Allergies</label>
          <textarea id="allergies" name="allergies" value={form.allergies} onChange={handleChange} rows={2} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergency_contact_name" className="label">Emergency Contact Name</label>
            <input id="emergency_contact_name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label htmlFor="emergency_contact_phone" className="label">Emergency Contact Phone</label>
            <input id="emergency_contact_phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} className="input-field" />
          </div>
        </div>

        <div>
            <label htmlFor="status" className="label">Status *</label>
            <select id="status" name="status" value={form.status} onChange={handleChange} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deceased">Deceased</option>
            </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/patients" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
