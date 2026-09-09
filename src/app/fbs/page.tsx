'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FBSRecord {
  id: string;
  patient_id: string;
  encounter_id: string;
  recorded_by: string;
  fbs_value: number;
  fasting_hours?: number;
  notes?: string;
  status: string;
  recorded_at: string;
  patient_profiles?: { first_name: string; last_name: string };
}

export default function FBSPage() {
  const [records, setRecords] = useState<FBSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    fbs_value: '',
    fasting_hours: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    const { data } = await supabase
      .from('fbs_records')
      .select('*, patient_profiles(first_name, last_name)')
      .order('recorded_at', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fbsVal = parseFloat(formData.fbs_value);
      let status = 'normal';
      if (fbsVal >= 126) status = 'high';
      else if (fbsVal >= 100) status = 'pre_diabetic';

      const { error } = await supabase.from('fbs_records').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        recorded_by: user.id,
        fbs_value: fbsVal,
        fasting_hours: formData.fasting_hours ? parseFloat(formData.fasting_hours) : null,
        notes: formData.notes || null,
        status,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('FBS recorded');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', fbs_value: '', fasting_hours: '', notes: '' });
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'pre_diabetic': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">FBS Records</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Record FBS'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">New FBS Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient ID *</label>
                <input name="patient_id" required className="input-field" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: e.target.value})} />
              </div>
              <div>
                <label className="label">Encounter ID</label>
                <input name="encounter_id" className="input-field" value={formData.encounter_id} onChange={(e) => setFormData({...formData, encounter_id: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">FBS Value (mg/dL) *</label>
                <input name="fbs_value" type="number" step="0.1" required className="input-field" value={formData.fbs_value} onChange={(e) => setFormData({...formData, fbs_value: e.target.value})} />
              </div>
              <div>
                <label className="label">Fasting Hours</label>
                <input name="fasting_hours" type="number" step="0.5" className="input-field" value={formData.fasting_hours} onChange={(e) => setFormData({...formData, fasting_hours: e.target.value})} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input name="notes" className="input-field" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Save FBS Record'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No FBS records</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>FBS (mg/dL)</th>
                  <th>Fasting</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.patient_profiles?.first_name} {r.patient_profiles?.last_name}</td>
                    <td className="font-bold">{r.fbs_value}</td>
                    <td>{r.fasting_hours ? `${r.fasting_hours}h` : '-'}</td>
                    <td>
                      <span className={`badge ${getStatusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className="text-sm text-gray-500">{r.notes || '-'}</td>
                    <td>{formatDate(r.recorded_at)}</td>
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
