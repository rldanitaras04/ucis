'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { getStatusColor } from '@/lib/utils';

interface QueueEntry {
  id: string;
  queue_number: number;
  patient_id: string;
  clinic_id: string;
  service_id: string;
  status: string;
  priority: number;
  created_at: string;
  patient_profiles?: {
    first_name: string;
    last_name: string;
  };
  clinic_services?: {
    name: string;
  };
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [clinics, setClinics] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadQueue();
    loadClinics();
  }, [selectedClinic]);

  const loadClinics = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_active', true);
    setClinics(data || []);
  };

  const loadQueue = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('queue_entries')
      .select(`
        *,
        patient_profiles(first_name, last_name),
        clinic_services(name)
      `)
      .eq('queue_date', today)
      .order('queue_number', { ascending: true });

    if (selectedClinic) {
      query = query.eq('clinic_id', selectedClinic);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load queue');
    } else {
      setQueue(data || []);
    }
    setLoading(false);
  };

  const callNext = async () => {
    const waiting = queue.filter(q => q.status === 'waiting');
    if (waiting.length === 0) {
      toast.error('No patients waiting');
      return;
    }

    const next = waiting[0];
    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'called',
        called_at: new Date().toISOString()
      })
      .eq('id', next.id);

    if (error) {
      toast.error('Failed to call patient');
    } else {
      toast.success(`Calling patient #${next.queue_number}`);
      loadQueue();
    }
  };

  const startService = async (id: string) => {
    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'in_service',
        started_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to start service');
    } else {
      toast.success('Service started');
      loadQueue();
    }
  };

  const completeService = async (id: string) => {
    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to complete service');
    } else {
      toast.success('Service completed');
      loadQueue();
    }
  };

  const cancelEntry = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this queue entry?')) return;
    
    const { error } = await supabase
      .from('queue_entries')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to cancel');
    } else {
      toast.success('Queue entry cancelled');
      loadQueue();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
        <button onClick={callNext} className="btn-primary">
          Call Next Patient
        </button>
      </div>

      {/* Clinic Filter */}
      <div className="mb-6">
        <label className="label">Filter by Clinic</label>
        <select
          className="input-field max-w-xs"
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
        >
          <option value="">All Clinics</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </div>

      {/* Queue List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : queue.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No queue entries today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Queue #</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-bold">{entry.queue_number}</td>
                    <td>
                      {entry.patient_profiles?.first_name} {entry.patient_profiles?.last_name}
                    </td>
                    <td>{entry.clinic_services?.name}</td>
                    <td>
                      <span className={`badge ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>{new Date(entry.created_at).toLocaleTimeString()}</td>
                    <td>
                      <div className="flex space-x-2">
                        {entry.status === 'waiting' && (
                          <>
                            <button
                              onClick={() => startService(entry.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => cancelEntry(entry.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {entry.status === 'in_service' && (
                          <button
                            onClick={() => completeService(entry.id)}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            Complete
                          </button>
                        )}
                      </div>
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
