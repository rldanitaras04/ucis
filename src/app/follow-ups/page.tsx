'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FollowUp {
  id: string;
  patient_id: string;
  encounter_id: string;
  recommended_date: string;
  reason: string;
  notes?: string;
  status: string;
  created_at: string;
  patient_profiles?: { first_name: string; last_name: string };
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    recommended_date: '',
    reason: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadFollowUps(); }, []);

  const loadFollowUps = async () => {
    const { data } = await supabase
      .from('follow_ups')
      .select('*, patient_profiles(first_name, last_name)')
      .order('recommended_date', { ascending: true });
    setFollowUps(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('follow_ups').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        recommended_date: formData.recommended_date,
        reason: formData.reason,
        notes: formData.notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Follow-up created');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', recommended_date: '', reason: '', notes: '' });
      loadFollowUps();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const completeFollowUp = async (id: string) => {
    const { error } = await supabase.from('follow_ups').update({ status: 'completed' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Follow-up completed');
    loadFollowUps();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Follow-up'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Schedule Follow-up</h2>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Recommended Date *</label>
                <input name="recommended_date" type="date" required className="input-field" value={formData.recommended_date} onChange={(e) => setFormData({...formData, recommended_date: e.target.value})} />
              </div>
              <div>
                <label className="label">Reason *</label>
                <input name="reason" required className="input-field" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" rows={2} className="input-field" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Follow-up'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : followUps.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No follow-ups</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Recommended Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((f) => (
                  <tr key={f.id}>
                    <td>{f.patient_profiles?.first_name} {f.patient_profiles?.last_name}</td>
                    <td>{f.reason}</td>
                    <td>{formatDate(f.recommended_date)}</td>
                    <td><span className={`badge ${getStatusColor(f.status)}`}>{f.status}</span></td>
                    <td>
                      {f.status === 'pending' && (
                        <button onClick={() => completeFollowUp(f.id)} className="text-sm text-green-600 hover:text-green-800">
                          Complete
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