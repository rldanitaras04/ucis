'use client';

import { useState, useEffect } from 'react';
import { callNextPatient, startQueueService, completeQueueService, cancelQueueEntry, addToQueue, fetchQueue, fetchServices } from './actions';
import PatientSearch from '@/components/PatientSearch';
import { DEFAULT_CLINIC_ID } from '@/lib/config';
import Link from 'next/link';

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
  encounter_id?: string;
  encounter?: { chief_complaint?: string } | { chief_complaint?: string }[] | null;
  chief_complaint?: string;
  patient?: {
    id: string;
    user_profile?: {
      id: string;
      first_name: string;
      last_name: string;
      user_type?: string;
      employee_student_id?: string;
      college?: string;
      course?: string;
      year_level?: string;
      department?: string;
      position?: string;
    };
  };
  service?: { name: string };
}

interface ClinicService {
  id: string;
  name: string;
  clinic_id: string;
}

export default function QueuePage() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [formData, setFormData] = useState({ patient_id: '', service_id: '', chief_complaint: '' });

  const loadQueue = async () => {
    const result = await fetchQueue();
    if (result.success) {
      setQueueEntries(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const loadServices = async () => {
    const result = await fetchServices(DEFAULT_CLINIC_ID);
    if (result.success) {
      setServices(result.data);
    }
  };

  useEffect(() => {
    loadQueue();
    loadServices();
  }, []);

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add');
    setError(null);
    setSuccess(null);

    const result = await addToQueue({
      patient_id: formData.patient_id,
      clinic_id: DEFAULT_CLINIC_ID,
      service_id: formData.service_id,
      chief_complaint: formData.chief_complaint || undefined,
    });

    if (result.success) {
      setSuccess('Patient added to queue');
      setShowAddForm(false);
      setFormData({ patient_id: '', service_id: '', chief_complaint: '' });
      await loadQueue();
    } else {
      setError(result.error || 'Failed to add to queue');
    }
    setActionLoading(null);
  };

  const handleCallNext = async () => {
    setActionLoading('call');
    const result = await callNextPatient();
    if (result.success) {
      await loadQueue();
    } else {
      setError(result.error || 'Failed to call next patient');
    }
    setActionLoading(null);
  };

  const handleStartService = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await startQueueService(entryId);
    if (result.success) {
      await loadQueue();
    } else {
      setError(result.error || 'Failed to start service');
    }
    setActionLoading(null);
  };

  const handleCompleteService = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await completeQueueService(entryId);
    if (result.success) {
      await loadQueue();
    } else {
      setError(result.error || 'Failed to complete service');
    }
    setActionLoading(null);
  };

  const handleCancel = async (entryId: string) => {
    setActionLoading(entryId);
    const result = await cancelQueueEntry(entryId);
    if (result.success) {
      setSuccess('Queue entry cancelled');
      setConfirmCancel(null);
      await loadQueue();
    } else {
      setError(result.error || 'Failed to cancel entry');
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'badge-warning';
      case 'called': return 'badge-info';
      case 'in_service': return 'badge-success';
      case 'completed': return 'badge-neutral';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading queue">
        <div className="spinner"></div>
        <span className="sr-only">Loading queue...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Queue Management</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary">
            {showAddForm ? 'Cancel' : 'Add to Queue'}
          </button>
          <button onClick={handleCallNext} disabled={actionLoading === 'call'} className="btn-primary">
            {actionLoading === 'call' ? 'Calling...' : 'Call Next Patient'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Dismiss">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">{success}</div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddToQueue} className="card mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PatientSearch
              id="queue-patient-search"
              label="Patient"
              required
              value={formData.patient_id}
              onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
            />
            <div>
              <label htmlFor="service_id" className="label">Service *</label>
              <select id="service_id" required value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })} className="select-field">
                <option value="">Select service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="chief_complaint" className="label">Chief Complaint</label>
            <input
              id="chief_complaint"
              type="text"
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              className="input-field"
              placeholder="e.g. Fever, headache..."
            />
          </div>
          <button type="submit" disabled={actionLoading === 'add'} className="btn-primary">
            {actionLoading === 'add' ? 'Adding...' : 'Add to Queue'}
          </button>
        </form>
      )}

      {/* Cancel Confirmation Dialog */}
      {confirmCancel && (
        <div className="dialog-overlay" onClick={() => setConfirmCancel(null)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cancel-queue-dialog-title">
            <h3 id="cancel-queue-dialog-title" className="text-subheading text-[#0F172A] mb-2">Cancel Queue Entry?</h3>
            <p className="text-body text-[#64748B] mb-4">This action will remove the patient from the queue. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmCancel(null)} className="btn-secondary">Keep</button>
              <button onClick={() => handleCancel(confirmCancel)} disabled={actionLoading === confirmCancel} className="btn-danger">
                {actionLoading === confirmCancel ? 'Cancelling...' : 'Cancel Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Queue #</th>
                <th scope="col">Patient</th>
                <th scope="col">Details</th>
                <th scope="col">Chief Complaint</th>
                <th scope="col">Service</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {queueEntries.map((entry) => {
                const profile = entry.patient?.user_profile;
                const isStudent = profile?.user_type === 'student';
                return (
                <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-medium tabular-nums">{entry.queue_number}</td>
                  <td>
                    <span className="font-medium text-[#0F172A]">{profile?.last_name}, {profile?.first_name}</span>
                    <br />
                    <span className="text-small text-[#64748B]">{profile?.employee_student_id || '—'}</span>
                  </td>
                  <td className="text-small text-[#64748B]">
                    {isStudent ? (
                      <>{profile?.course ? `${profile.course} ${profile.year_level || ''}`.toUpperCase() : '—'}</>
                    ) : (
                      <>{profile?.department ? `${profile.department} ${profile.position || ''}`.toUpperCase() : '—'}</>
                    )}
                  </td>
                  <td className="text-small text-[#64748B] max-w-[200px] truncate">
                    {(Array.isArray(entry.encounter) ? entry.encounter[0]?.chief_complaint : entry.encounter?.chief_complaint) || '—'}
                  </td>
                  <td>{entry.service?.name}</td>
                  <td>
                    <span className={`badge ${getStatusColor(entry.status)}`}>
                      {entry.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {entry.status === 'in_service' && entry.encounter_id && (
                        <>
                          <Link href={`/vitals?encounter=${entry.encounter_id}&patient=${entry.patient_id}`} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium text-sm">Vitals</Link>
                          <Link href={`/fbs?encounter=${entry.encounter_id}&patient=${entry.patient_id}`} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium text-sm">FBS</Link>
                          <Link href={`/prescriptions?encounter=${entry.encounter_id}&patient=${entry.patient_id}`} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium text-sm">Rx</Link>
                        </>
                      )}
                      {entry.status === 'waiting' && (
                        <button onClick={() => handleStartService(entry.id)} disabled={actionLoading === entry.id} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium disabled:opacity-50">Start</button>
                      )}
                      {entry.status === 'called' && (
                        <button onClick={() => handleStartService(entry.id)} disabled={actionLoading === entry.id} className="text-[#059669] hover:text-[#047857] font-medium disabled:opacity-50">Begin</button>
                      )}
                      {entry.status === 'in_service' && (
                        <button onClick={() => handleCompleteService(entry.id)} disabled={actionLoading === entry.id} className="text-[#059669] hover:text-[#047857] font-medium disabled:opacity-50">Complete</button>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'called') && (
                        <button onClick={() => setConfirmCancel(entry.id)} className="text-[#DC2626] hover:text-[#B91C1C] font-medium">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {queueEntries.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-title">No queue entries today</p>
            <p className="empty-state-description">Add patients to the queue to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
