'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Referral {
  id: string;
  patient_id: string;
  encounter_id: string;
  referred_by: string;
  referral_reason: string;
  destination: string;
  urgency: string;
  instructions?: string;
  status: string;
  created_at: string;
  patient_profiles?: { first_name: string; last_name: string };
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    referral_reason: '',
    destination: '',
    urgency: 'routine',
    instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadReferrals(); }, []);

  const loadReferrals = async () => {
    const { data } = await supabase
      .from('clinical_referrals')
      .select('*, patient_profiles(first_name, last_name)')
      .order('created_at', { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('clinical_referrals').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        referred_by: user.id,
        referral_reason: formData.referral_reason,
        destination: formData.destination,
        urgency: formData.urgency,
        instructions: formData.instructions || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Referral created');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', referral_reason: '', destination: '', urgency: 'routine', instructions: '' });
      loadReferrals();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Referral'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Referral</h2>
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
            <div>
              <label className="label">Referral Reason *</label>
              <textarea name="referral_reason" rows={3} required className="input-field" value={formData.referral_reason} onChange={(e) => setFormData({...formData, referral_reason: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Destination *</label>
                <input name="destination" required className="input-field" placeholder="e.g., City Hospital" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
              </div>
              <div>
                <label className="label">Urgency</label>
                <select name="urgency" className="input-field" value={formData.urgency} onChange={(e) => setFormData({...formData, urgency: e.target.value})}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Instructions</label>
              <textarea name="instructions" rows={2} className="input-field" value={formData.instructions} onChange={(e) => setFormData({...formData, instructions: e.target.value})} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Referral'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : referrals.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No referrals</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Destination</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>{r.patient_profiles?.first_name} {r.patient_profiles?.last_name}</td>
                    <td className="max-w-xs truncate">{r.referral_reason}</td>
                    <td>{r.destination}</td>
                    <td className="capitalize">{r.urgency}</td>
                    <td><span className={`badge ${getStatusColor(r.status)}`}>{r.status}</span></td>
                    <td>{formatDate(r.created_at)}</td>
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
