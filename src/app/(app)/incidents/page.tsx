'use client';

import { useState, useEffect } from 'react';
import { createIncident, updateIncidentStatus, fetchIncidents } from './actions';

interface Incident {
  id: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  description: string;
  patient_id?: string;
  reported_by?: string;
  status: string;
  patient?: { first_name: string; last_name: string };
  reporter?: { first_name: string; last_name: string };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ incidentId: string; status: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    incident_type: 'clinical',
    severity: 'medium',
    description: '',
    patient_id: '',
    status: 'open',
  });

  const loadIncidents = async () => {
    const result = await fetchIncidents();
    if (result.success) {
      setIncidents(result.data);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    loadIncidents();
    setLoading(false);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-info';
      case 'low': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'badge-info';
      case 'investigating': return 'badge-warning';
      case 'resolved': return 'badge-success';
      case 'closed': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await createIncident({
      title: formData.title,
      incident_type: formData.incident_type,
      severity: formData.severity,
      description: formData.description,
      patient_id: formData.patient_id || undefined,
      status: formData.status,
    });

    if (result.success) {
      setSuccess('Incident reported successfully');
      setShowForm(false);
      setFormData({ title: '', incident_type: 'clinical', severity: 'medium', description: '', patient_id: '', status: 'open' });
      loadIncidents();
    } else {
      setError(result.error);
    }

    setSubmitting(false);
  };

  const handleStatusUpdate = async () => {
    if (!confirmDialog) return;
    setStatusUpdating(confirmDialog.incidentId);
    setError(null);
    setSuccess(null);

    const result = await updateIncidentStatus(confirmDialog.incidentId, confirmDialog.status);

    if (result.success) {
      setSuccess(`Incident status updated to ${confirmDialog.status}`);
      loadIncidents();
    } else {
      setError(result.error);
    }

    setStatusUpdating(null);
    setConfirmDialog(null);
  };

  const statusOptions = ['open', 'investigating', 'resolved', 'closed'] as const;
  const getNextStatus = (current: string) => {
    const idx = statusOptions.indexOf(current as typeof statusOptions[number]);
    return idx < statusOptions.length - 1 ? statusOptions[idx + 1] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading incidents">
        <div className="spinner"></div>
        <span className="sr-only">Loading incidents...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading text-[#0F172A]">Incident Reports</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Report Incident'}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">
          {success}
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-subheading text-[#0F172A] mb-4">Report New Incident</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                className="input-field"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief title for the incident"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Incident Type</label>
                <select
                  className="select-field"
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  required
                >
                  <option value="clinical">Clinical</option>
                  <option value="administrative">Administrative</option>
                  <option value="safety">Safety</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Severity</label>
                <select
                  className="select-field"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  required
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="label">Patient ID (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  placeholder="Leave empty if not patient-related"
                />
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="select-field"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                className="input-field"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of the incident..."
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-subheading text-[#0F172A] mb-2">Confirm Status Update</h3>
            <p className="text-body text-[#64748B] mb-6">
              Are you sure you want to change the incident status to <strong className="text-[#334155]">{confirmDialog.status}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                className="btn-primary"
                disabled={statusUpdating !== null}
              >
                {statusUpdating ? 'Updating...' : 'Confirm'}
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
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Severity</th>
                <th scope="col">Patient</th>
                <th scope="col">Reported By</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {incidents.map((incident) => {
                const nextStatus = getNextStatus(incident.status);
                return (
                  <tr key={incident.id} className="hover:bg-[#F8FAFC]">
                    <td>
                      {new Date(incident.incident_date).toLocaleDateString()}
                    </td>
                    <td>{incident.incident_type}</td>
                    <td>
                      <span className={`badge ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      {incident.patient ? `${incident.patient.last_name}, ${incident.patient.first_name}` : 'N/A'}
                    </td>
                    <td>
                      {incident.reporter ? `${incident.reporter.last_name}, ${incident.reporter.first_name}` : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td>
                      {nextStatus && (
                        <button
                          onClick={() => setConfirmDialog({ incidentId: incident.id, status: nextStatus })}
                          className="btn-secondary text-xs"
                        >
                          Update to {nextStatus}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {incidents.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No incidents reported
          </div>
        )}
      </div>
    </div>
  );
}
