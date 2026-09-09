'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { callNextPatient, startQueueService, completeQueueService, cancelQueueEntry, addToQueue } from './actions';

interface QueueEntry {
  id: string;
  queue_number: number;
  patient_id: string;
  clinic_id: string;
  service_id: string;
  status: string;
  priority: number;
  queue_date: string;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  patient?: { first_name: string; last_name: string; patient_id: string };
  clinic?: { name: string };
  service?: { name: string };
}

export default function QueuePage() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchQueue = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id), clinic:clinics!clinic_id(name), service:clinic_services!service_id(name)')
      .eq('queue_date', today)
      .order('queue_number', { ascending: true });

    if (fetchError) {
      setError('Failed to fetch queue entries');
      return;
    }

    setQueueEntries(data || []);
  };

  useEffect(() => {
    fetchQueue();
    setLoading(false);
  }, []);

  const handleCallNext = async () => {
    setActionLoading('call');
    const result = await callNextPatient();
    if (result.success) {
      await fetchQueue();
    } else {
      setError(result.error || 'Failed to call next patient');
    }
    setActionLoading(null);
  };

  const handleStartService = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await startQueueService(entryId);
    if (result.success) {
      await fetchQueue();
    } else {
      setError(result.error || 'Failed to start service');
    }
    setActionLoading(null);
  };

  const handleCompleteService = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await completeQueueService(entryId);
    if (result.success) {
      await fetchQueue();
    } else {
      setError(result.error || 'Failed to complete service');
    }
    setActionLoading(null);
  };

  const handleCancel = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await cancelQueueEntry(entryId);
    if (result.success) {
      await fetchQueue();
    } else {
      setError(result.error || 'Failed to cancel entry');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'in_service': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Queue Management</h1>
        <button
          onClick={handleCallNext}
          disabled={actionLoading === 'call'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {actionLoading === 'call' ? 'Calling...' : 'Call Next Patient'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {queueEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.queue_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.patient?.last_name}, {entry.patient?.first_name}
                  <br />
                  <span className="text-xs text-gray-500">{entry.patient?.patient_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.clinic?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.service?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(entry.status)}`}>
                    {entry.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {entry.status === 'waiting' && (
                    <button
                      onClick={() => handleStartService(entry.id)}
                      disabled={actionLoading === entry.id}
                      className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  {entry.status === 'called' && (
                    <button
                      onClick={() => handleStartService(entry.id)}
                      disabled={actionLoading === entry.id}
                      className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                    >
                      Begin
                    </button>
                  )}
                  {entry.status === 'in_service' && (
                    <button
                      onClick={() => handleCompleteService(entry.id)}
                      disabled={actionLoading === entry.id}
                      className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}
                  {(entry.status === 'waiting' || entry.status === 'called') && (
                    <button
                      onClick={() => handleCancel(entry.id)}
                      disabled={actionLoading === entry.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queueEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">No queue entries today</div>
        )}
      </div>
    </div>
  );
}
