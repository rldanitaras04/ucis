'use client';

import { useState } from 'react';
import { registerPatient } from '../actions';

export default function PatientRegisterPage() {
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await registerPatient({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      sex: formData.sex,
      blood_type: formData.blood_type || undefined,
      allergies: formData.allergies || undefined,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      university_id: formData.university_id || undefined,
      user_type: formData.user_type,
    });

    if (result.success) {
      setSuccess(true);
      setPatientId(result.id);
      setFormData({
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
    } else {
      setError(result.error || 'Failed to register patient');
    }
    setLoading(false);
  };

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-heading text-[#0F172A] mb-6">Register Patient</h1>

      {success && (
        <div className="alert-success mb-4" role="status">
          Patient registered successfully! ID: {patientId}
        </div>
      )}

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="label">First Name *</label>
            <input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="label">Last Name *</label>
            <input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="date_of_birth" className="label">Date of Birth</label>
            <input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="sex" className="label">Sex *</label>
            <select
              id="sex"
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
              required
              className="select-field"
            >
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="blood_type" className="label">Blood Type</label>
            <select
              id="blood_type"
              value={formData.blood_type}
              onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
              className="select-field"
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user_type" className="label">User Type *</label>
            <select
              id="user_type"
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              required
              className="select-field"
            >
              <option value="student">Student</option>
              <option value="employee">Employee</option>
              <option value="dependent">Dependent</option>
            </select>
          </div>
          <div>
            <label htmlFor="university_id" className="label">University ID</label>
            <input
              id="university_id"
              type="text"
              value={formData.university_id}
              onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="allergies" className="label">Allergies</label>
          <textarea
            id="allergies"
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            rows={2}
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergency_contact_name" className="label">Emergency Contact Name</label>
            <input
              id="emergency_contact_name"
              type="text"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="emergency_contact_phone" className="label">Emergency Contact Phone</label>
            <input
              id="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Registering...' : 'Register Patient'}
        </button>
      </form>
    </div>
  );
}
