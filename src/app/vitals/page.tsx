'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface VitalSign {
  id: string;
  encounter_id: string;
  patient_id: string;
  recorded_by: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  notes?: string;
  recorded_at: string;
  patient_profiles?: { first_name: string; last_name: string };
  encounters?: { visit_date: string };
}

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    encounter_id: '',
    patient_id: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse_rate: '',
    respiratory_rate: '',
    temperature: '',
    oxygen_saturation: '',
    height: '',
    weight: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadVitals();
  }, []);

  const loadVitals = async () => {
    const { data, error } = await supabase
      .from('vital_signs')
      .select(`
        *,
        patient_profiles(first_name, last_name),
        encounters(visit_date)
      `)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Failed to load vitals');
    } else {
      setVitals(data || []);
    }
    setLoading(false);
  };

  const calculateBMI = (height: number, weight: number) => {
    if (!height || !weight) return null;
    const heightM = height / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const height = formData.height ? parseFloat(formData.height) : null;
      const weight = formData.weight ? parseFloat(formData.weight) : null;

      const { error } = await supabase.from('vital_signs').insert({
        encounter_id: formData.encounter_id || null,
        patient_id: formData.patient_id,
        recorded_by: user.id,
        blood_pressure_systolic: formData.blood_pressure_systolic ? parseInt(formData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseInt(formData.blood_pressure_diastolic) : null,
        pulse_rate: formData.pulse_rate ? parseInt(formData.pulse_rate) : null,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        oxygen_saturation: formData.oxygen_saturation ? parseFloat(formData.oxygen_saturation) : null,
        height,
        weight,
        bmi: height && weight ? calculateBMI(height, weight) : null,
        notes: formData.notes || null,
        recorded_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Vital signs recorded');
      setShowForm(false);
      setFormData({
        encounter_id: '',
        patient_id: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse_rate: '',
        respiratory_rate: '',
        temperature: '',
        oxygen_saturation: '',
        height: '',
        weight: '',
        notes: '',
      });
      loadVitals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vital Signs & Triage</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Record Vitals'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Vital Signs</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient ID *</label>
                <input name="patient_id" type="text" required className="input-field" value={formData.patient_id} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Encounter ID</label>
                <input name="encounter_id" type="text" className="input-field" value={formData.encounter_id} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">BP Systolic (mmHg)</label>
                <input name="blood_pressure_systolic" type="number" className="input-field" placeholder="120" value={formData.blood_pressure_systolic} onChange={handleChange} />
              </div>
              <div>
                <label className="label">BP Diastolic (mmHg)</label>
                <input name="blood_pressure_diastolic" type="number" className="input-field" placeholder="80" value={formData.blood_pressure_diastolic} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Pulse Rate (bpm)</label>
                <input name="pulse_rate" type="number" className="input-field" placeholder="72" value={formData.pulse_rate} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Respiratory Rate (/min)</label>
                <input name="respiratory_rate" type="number" className="input-field" placeholder="16" value={formData.respiratory_rate} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Temperature (°C)</label>
                <input name="temperature" type="number" step="0.1" className="input-field" placeholder="36.5" value={formData.temperature} onChange={handleChange} />
              </div>
              <div>
                <label className="label">O₂ Saturation (%)</label>
                <input name="oxygen_saturation" type="number" step="0.1" className="input-field" placeholder="98" value={formData.oxygen_saturation} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Height (cm)</label>
                <input name="height" type="number" step="0.1" className="input-field" value={formData.height} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input name="weight" type="number" step="0.1" className="input-field" value={formData.weight} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input name="notes" type="text" className="input-field" value={formData.notes} onChange={handleChange} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Save Vital Signs'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : vitals.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No vital signs recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>Temp</th>
                  <th>O₂</th>
                  <th>Height</th>
                  <th>Weight</th>
                  <th>BMI</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.id}>
                    <td>{v.patient_profiles?.first_name} {v.patient_profiles?.last_name}</td>
                    <td>{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}</td>
                    <td>{v.pulse_rate || '-'}</td>
                    <td>{v.temperature ? `${v.temperature}°C` : '-'}</td>
                    <td>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-'}</td>
                    <td>{v.height ? `${v.height}cm` : '-'}</td>
                    <td>{v.weight ? `${v.weight}kg` : '-'}</td>
                    <td>{v.bmi || '-'}</td>
                    <td>{formatDate(v.recorded_at)}</td>
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
