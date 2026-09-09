'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Clearance {
  id: string;
  patient_id: string;
  encounter_id: string;
  issued_by: string;
  clearance_type: string;
  control_number: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
  verification_token?: string;
  patient_profiles?: { first_name: string; last_name: string };
}

const CLEARANCE_TYPES = [
  'Medical Clearance',
  'PE Clearance',
  'Internship/OJT Clearance',
  'Athletics Clearance',
  'Employment Clearance',
  'Dental Clearance',
  'Health Certificate',
];

export default function ClearancesPage() {
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    clearance_type: '',
    expiry_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadClearances(); }, []);

  const loadClearances = async () => {
    const { data } = await supabase
      .from('clearances')
      .select('*, patient_profiles(first_name, last_name)')
      .order('issue_date', { ascending: false });
    setClearances(data || []);
    setLoading(false);
  };

  const generateControlNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `UCIS-CLR-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('clearances').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        issued_by: user.id,
        clearance_type: formData.clearance_type,
        control_number: generateControlNumber(),
        issue_date: new Date().toISOString(),
        expiry_date: formData.expiry_date || null,
        status: 'active',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Clearance issued');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', clearance_type: '', expiry_date: '' });
      loadClearances();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeClearance = async (id: string) => {
    if (!confirm('Revoke this clearance?')) return;
    const { error } = await supabase.from('clearances').update({ status: 'revoked' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Clearance revoked');
    loadClearances();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Clearances & Certificates</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Issue Clearance'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Issue New Clearance</h2>
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
                <label className="label">Clearance Type *</label>
                <select name="clearance_type" required className="input-field" value={formData.clearance_type} onChange={(e) => setFormData({...formData, clearance_type: e.target.value})}>
                  <option value="">Select type...</option>
                  {CLEARANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input name="expiry_date" type="date" className="input-field" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Issuing...' : 'Issue Clearance'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : clearances.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No clearances issued</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Control #</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Issue Date</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clearances.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-sm">{c.control_number}</td>
                    <td>{c.patient_profiles?.first_name} {c.patient_profiles?.last_name}</td>
                    <td>{c.clearance_type}</td>
                    <td>{formatDate(c.issue_date)}</td>
                    <td>{c.expiry_date ? formatDate(c.expiry_date) : '-'}</td>
                    <td><span className={`badge ${getStatusColor(c.status)}`}>{c.status}</span></td>
                    <td>
                      {c.status === 'active' && (
                        <button onClick={() => revokeClearance(c.id)} className="text-sm text-red-600 hover:text-red-800">
                          Revoke
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
