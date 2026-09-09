'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Incident {
  id: string;
  patient_id: string;
  encounter_id: string;
  reported_by: string;
  incident_date: string;
  location: string;
  circumstances: string;
  injury_information?: string;
  immediate_response?: string;
  treatment_provided?: string;
  referral?: string;
  status: string;
  created_at: string;
  patient_profiles?: { first_name: string; last_name: string };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_id: '',
    incident_date: '',
    location: '',
    circumstances: '',
    injury_information: '',
    immediate_response: '',
    treatment_provided: '',
    referral: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*, patient_profiles(first_name, last_name)')
      .order('incident_date', { ascending: false });
    setIncidents(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('incidents').insert({
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        reported_by: user.id,
        incident_date: formData.incident_date,
        location: formData.location,
        circumstances: formData.circumstances,
        injury_information: formData.injury_information || null,
        immediate_response: formData.immediate_response || null,
        treatment_provided: formData.treatment_provided || null,
        referral: formData.referral || null,
        status: 'reported',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Incident recorded');
      setShowForm(false);
      setFormData({ patient_id: '', encounter_id: '', incident_date: '', location: '', circumstances: '', injury_information: '', immediate_response: '', treatment_provided: '', referral: '' });
      loadIncidents();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Injury / Incident Records</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Report Incident'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Report Incident</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient ID *</label>
                <input name="patient_id" required className="input-field" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: e.target.value})} />
              </div>
              <div>
                <label className="label">Incident Date/Time *</label>
                <input name="incident_date" type="datetime-local" required className="input-field" value={formData.incident_date} onChange={(e) => setFormData({...formData, incident_date: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Location *</label>
              <input name="location" required className="input-field" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </div>
            <div>
              <label className="label">Circumstances *</label>
              <textarea name="circumstances" rows={3} required className="input-field" value={formData.circumstances} onChange={(e) => setFormData({...formData, circumstances: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Injury Information</label>
                <textarea name="injury_information" rows={2} className="input-field" value={formData.injury_information} onChange={(e) => setFormData({...formData, injury_information: e.target.value})} />
              </div>
              <div>
                <label className="label">Immediate Response</label>
                <textarea name="immediate_response" rows={2} className="input-field" value={formData.immediate_response} onChange={(e) => setFormData({...formData, immediate_response: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Treatment Provided</label>
                <textarea name="treatment_provided" rows={2} className="input-field" value={formData.treatment_provided} onChange={(e) => setFormData({...formData, treatment_provided: e.target.value})} />
              </div>
              <div>
                <label className="label">Referral</label>
                <input name="referral" className="input-field" value={formData.referral} onChange={(e) => setFormData({...formData, referral: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Submit Report'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No incidents reported</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Circumstances</th>
                  <th>Status</th>
                  <th>Date Reported</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>{inc.patient_profiles?.first_name} {inc.patient_profiles?.last_name}</td>
                    <td>{formatDate(inc.incident_date)}</td>
                    <td>{inc.location}</td>
                    <td className="max-w-xs truncate">{inc.circumstances}</td>
                    <td><span className={`badge ${getStatusColor(inc.status)}`}>{inc.status}</span></td>
                    <td>{formatDate(inc.created_at)}</td>
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