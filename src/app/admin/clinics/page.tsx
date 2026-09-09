'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createClinic, updateClinic, deleteClinic } from './actions';

interface Clinic {
  id: string;
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  operating_hours?: string;
  is_active: boolean;
}

const emptyClinic: Clinic = {
  id: '',
  name: '',
  description: '',
  location: '',
  capacity: undefined,
  operating_hours: '',
  is_active: true,
};

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [formData, setFormData] = useState<Clinic>(emptyClinic);
  const [confirmDelete, setConfirmDelete] = useState<Clinic | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  const fetchClinics = async () => {
    const { data, error: fetchError } = await supabase
      .from('clinics')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError('Failed to fetch clinics');
      return;
    }

    setClinics(data || []);
  };

  useEffect(() => {
    fetchClinics();
    setLoading(false);
  }, []);

  const resetForm = () => {
    setFormData(emptyClinic);
    setEditingClinic(null);
    setShowForm(false);
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData(clinic);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    if (editingClinic) {
      const result = await updateClinic(editingClinic.id, formData);
      if (result.success) {
        setSuccess('Clinic updated successfully');
        resetForm();
        fetchClinics();
      } else {
        setError(result.error);
      }
    } else {
      const result = await createClinic(formData);
      if (result.success) {
        setSuccess('Clinic created successfully');
        resetForm();
        fetchClinics();
      } else {
        setError(result.error);
      }
    }

    setActionLoading(false);
  };

  const handleDelete = async (clinic: Clinic) => {
    setActionLoading(true);
    const result = await deleteClinic(clinic.id);
    if (result.success) {
      setSuccess('Clinic deleted successfully');
      setConfirmDelete(null);
      fetchClinics();
    } else {
      setError(result.error);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading clinics">
        <div className="spinner"></div>
        <span className="sr-only">Loading clinics...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">Clinic Management</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]">&times;</button>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : 'Add Clinic'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-subheading text-[#0F172A] mb-4">
            {editingClinic ? 'Edit Clinic' : 'Add New Clinic'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clinic-name" className="label">Name *</label>
                <input
                  id="clinic-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="Clinic name"
                />
              </div>
              <div>
                <label htmlFor="clinic-location" className="label">Location</label>
                <input
                  id="clinic-location"
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field w-full"
                  placeholder="Address or location"
                />
              </div>
              <div>
                <label htmlFor="clinic-capacity" className="label">Capacity</label>
                <input
                  id="clinic-capacity"
                  type="number"
                  min="0"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="input-field w-full"
                  placeholder="Max patients"
                />
              </div>
              <div>
                <label htmlFor="clinic-hours" className="label">Operating Hours</label>
                <input
                  id="clinic-hours"
                  type="text"
                  value={formData.operating_hours || ''}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g. Mon-Fri 8AM-5PM"
                />
              </div>
            </div>
            <div>
              <label htmlFor="clinic-description" className="label">Description</label>
              <textarea
                id="clinic-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full"
                rows={3}
                placeholder="Brief description of the clinic"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="clinic-active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-[#94A3B8] text-[#0F172A] focus:ring-[#334155]"
              />
              <label htmlFor="clinic-active" className="label mb-0">Active</label>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={actionLoading} className="btn-primary">
                {actionLoading ? 'Saving...' : editingClinic ? 'Update Clinic' : 'Create Clinic'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-subheading text-[#0F172A]">{clinic.name}</h3>
              <span className={`badge ${
                clinic.is_active ? 'badge-success' : 'badge-neutral'
              }`}>
                {clinic.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {clinic.description && (
              <p className="text-body text-[#64748B] mb-2">{clinic.description}</p>
            )}
            {clinic.location && (
              <p className="text-small text-[#94A3B8] mb-1">Location: {clinic.location}</p>
            )}
            {clinic.capacity && (
              <p className="text-small text-[#94A3B8] mb-1">Capacity: {clinic.capacity}</p>
            )}
            {clinic.operating_hours && (
              <p className="text-small text-[#94A3B8] mb-3">Hours: {clinic.operating_hours}</p>
            )}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleEdit(clinic)}
                className="btn-secondary text-xs flex-1"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(clinic)}
                className="btn-danger text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {clinics.length === 0 && (
        <div className="text-center py-12 text-body text-[#64748B]">
          No clinics configured
        </div>
      )}

      {confirmDelete && (
        <div className="dialog-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-subheading text-[#0F172A] mb-2">Delete Clinic?</h3>
            <p className="text-body text-[#64748B] mb-4">
              This will permanently delete {confirmDelete.name}. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading}
                className="btn-danger"
              >
                {actionLoading ? 'Deleting...' : 'Delete Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
