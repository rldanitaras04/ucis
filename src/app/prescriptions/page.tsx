'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Prescription {
  id: string;
  patient_id: string;
  encounter_id: string;
  prescribed_by: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills: number;
  instructions?: string;
  status: string;
  prescribed_date: string;
  patient_profiles?: { first_name: string; last_name: string };
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    refills: '0',
    instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient_profiles(first_name, last_name)
      `)
      .order('prescribed_date', { ascending: false });

    if (error) {
      toast.error('Failed to load prescriptions');
    } else {
      setPrescriptions(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('prescriptions').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        prescribed_by: user.id,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration || null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        refills: parseInt(formData.refills),
        instructions: formData.instructions || null,
        status: 'active',
        prescribed_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Prescription created');
      setShowForm(false);
      setFormData({
        patient_id: '',
        encounter_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        refills: '0',
        instructions: '',
      });
      loadPrescriptions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPrescription = async (id: string) => {
    if (!confirm('Cancel this prescription?')) return;

    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to cancel prescription');
    } else {
      toast.success('Prescription cancelled');
      loadPrescriptions();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Prescription'}
        </button>
      </div>

      {/* New Prescription Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Prescription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient ID</label>
                <input
                  name="patient_id"
                  type="text"
                  required
                  className="input-field"
                  value={formData.patient_id}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Encounter ID (optional)</label>
                <input
                  name="encounter_id"
                  type="text"
                  className="input-field"
                  value={formData.encounter_id}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Medication Name</label>
                <input
                  name="medication_name"
                  type="text"
                  required
                  className="input-field"
                  value={formData.medication_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Dosage</label>
                <input
                  name="dosage"
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g., 500mg"
                  value={formData.dosage}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Frequency</label>
                <select
                  name="frequency"
                  required
                  className="input-field"
                  value={formData.frequency}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="once_daily">Once daily</option>
                  <option value="twice_daily">Twice daily</option>
                  <option value="three_times_daily">Three times daily</option>
                  <option value="four_times_daily">Four times daily</option>
                  <option value="as_needed">As needed</option>
                </select>
              </div>
              <div>
                <label className="label">Duration</label>
                <input
                  name="duration"
                  type="text"
                  className="input-field"
                  placeholder="e.g., 7 days"
                  value={formData.duration}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  className="input-field"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="label">Refills</label>
              <input
                name="refills"
                type="number"
                min="0"
                className="input-field max-w-xs"
                value={formData.refills}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Instructions</label>
              <textarea
                name="instructions"
                rows={3}
                className="input-field"
                value={formData.instructions}
                onChange={handleChange}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Prescription'}
            </button>
          </form>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : prescriptions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No prescriptions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td>
                      {rx.patient_profiles?.first_name} {rx.patient_profiles?.last_name}
                    </td>
                    <td className="font-medium">{rx.medication_name}</td>
                    <td>{rx.dosage}</td>
                    <td className="capitalize">{rx.frequency.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge ${getStatusColor(rx.status)}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td>{formatDate(rx.prescribed_date)}</td>
                    <td>
                      {rx.status === 'active' && (
                        <button
                          onClick={() => cancelPrescription(rx.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
