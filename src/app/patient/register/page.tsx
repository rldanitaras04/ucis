'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function PatientRegisterPage() {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [clinics, setClinics] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    sex: 'male',
    blood_type: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    university_id: '',
    user_type: 'walk_in',
  });

  const supabase = createClient();

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadServices(selectedClinic);
    }
  }, [selectedClinic]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadClinics = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setClinics(data || []);
  };

  const loadServices = async (clinicId: string) => {
    const { data } = await supabase
      .from('clinic_services')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name');
    setServices(data || []);
  };

  const searchPatients = async () => {
    const { data } = await supabase
      .from('patient_profiles')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults(data || []);
  };

  const handleNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create patient profile
      const { data: patient, error: patientError } = await supabase
        .from('patient_profiles')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          sex: formData.sex,
          blood_type: formData.blood_type || null,
          allergies: formData.allergies || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          university_id: formData.university_id || null,
          user_type: formData.user_type,
          status: 'active',
        })
        .select()
        .single();

      if (patientError) throw patientError;

      toast.success(`Patient ${patient.first_name} ${patient.last_name} registered`);

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        sex: 'male',
        blood_type: '',
        allergies: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        university_id: '',
        user_type: 'walk_in',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQueue = async (patientId: string) => {
    if (!selectedClinic) {
      toast.error('Please select a clinic');
      return;
    }

    const selectedService = services[0]; // Default to first service
    if (!selectedService) {
      toast.error('No services available for this clinic');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get next queue number
      const { data: lastEntry } = await supabase
        .from('queue_entries')
        .select('queue_number')
        .eq('clinic_id', selectedClinic)
        .eq('queue_date', today)
        .order('queue_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastEntry?.queue_number || 0) + 1;

      const { error } = await supabase.from('queue_entries').insert({
        patient_id: patientId,
        clinic_id: selectedClinic,
        service_id: selectedService.id,
        queue_date: today,
        queue_number: nextNumber,
        status: 'waiting',
        priority: 1,
      });

      if (error) throw error;

      toast.success(`Added to queue as #${nextNumber}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to queue');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Patient Registration</h1>

      {/* Mode Toggle */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode('new')}
          className={`px-4 py-2 rounded-lg ${mode === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Register New Patient
        </button>
        <button
          onClick={() => setMode('existing')}
          className={`px-4 py-2 rounded-lg ${mode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Find Existing Patient
        </button>
      </div>

      {/* Clinic Selection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Clinic</h2>
        <select
          className="input-field max-w-md"
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
        >
          <option value="">Choose a clinic...</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </div>

      {/* New Patient Form */}
      {mode === 'new' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Patient Information</h2>
          <form onSubmit={handleNewPatient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  name="first_name"
                  type="text"
                  required
                  className="input-field"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  name="last_name"
                  type="text"
                  required
                  className="input-field"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  name="email"
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  className="input-field"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input
                  name="date_of_birth"
                  type="date"
                  className="input-field"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Sex</label>
                <select
                  name="sex"
                  className="input-field"
                  value={formData.sex}
                  onChange={handleChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="label">Blood Type</label>
                <select
                  name="blood_type"
                  className="input-field"
                  value={formData.blood_type}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">User Type</label>
                <select
                  name="user_type"
                  className="input-field"
                  value={formData.user_type}
                  onChange={handleChange}
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="non_teaching_staff">Non-Teaching Staff</option>
                </select>
              </div>
              <div>
                <label className="label">University/Employee ID</label>
                <input
                  name="university_id"
                  type="text"
                  className="input-field"
                  value={formData.university_id}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="label">Allergies</label>
              <textarea
                name="allergies"
                rows={2}
                className="input-field"
                value={formData.allergies}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Emergency Contact Name</label>
                <input
                  name="emergency_contact_name"
                  type="text"
                  className="input-field"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Emergency Contact Phone</label>
                <input
                  name="emergency_contact_phone"
                  type="tel"
                  className="input-field"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </form>
        </div>
      )}

      {/* Search Existing Patients */}
      {mode === 'existing' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Patient</h2>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input-field mb-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                    <p className="text-sm text-gray-500">{patient.email || 'No email'}</p>
                  </div>
                  <button
                    onClick={() => handleAddToQueue(patient.id)}
                    className="btn-primary text-sm"
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-gray-500">No patients found</p>
          )}
        </div>
      )}
    </div>
  );
}
