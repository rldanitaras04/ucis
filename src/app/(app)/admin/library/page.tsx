'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllSystemConfigs, createSystemConfig, updateSystemConfig, deleteSystemConfig,
  fetchClinicServices, createClinicService, updateClinicService, deleteClinicService,
} from './actions';

interface ConfigEntry {
  id: string;
  config_key: string;
  config_value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface ServiceEntry {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

const CONFIG_GROUPS: Record<string, { label: string; description: string }> = {
  patient_type: { label: 'Patient Types', description: 'Options for patient classification during registration' },
  user_type: { label: 'User Types', description: 'Options for user classification during account creation' },
};

const SERVICE_CATEGORIES = ['medical', 'dental', 'fbs', 'pharmacy', 'general'];

const TABS = [
  { key: 'patient_type', label: 'Patient Types' },
  { key: 'user_type', label: 'User Types' },
  { key: 'clinic_services', label: 'Clinic Services' },
];

export default function LibraryManagementPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('patient_type');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConfigEntry | ServiceEntry | null>(null);
  const [formData, setFormData] = useState({ config_value: '', label: '', sort_order: 0, name: '', category: 'medical', description: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfigEntry | ServiceEntry | null>(null);

  const loadConfigs = useCallback(async () => {
    const result = await fetchAllSystemConfigs();
    if (result.success) setConfigs(result.data);
    else setError(result.error);
  }, []);

  const loadServices = useCallback(async () => {
    const result = await fetchClinicServices();
    if (result.success) setServices(result.data);
    else setError(result.error);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadConfigs(), loadServices()]);
    setLoading(false);
  }, [loadConfigs, loadServices]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const isServices = activeGroup === 'clinic_services';
  const filteredConfigs = configs.filter(c => c.config_key === activeGroup);

  const resetForm = () => {
    setFormData({ config_value: '', label: '', sort_order: 0, name: '', category: 'medical', description: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (entry: ConfigEntry | ServiceEntry) => {
    setEditing(entry);
    if ('config_key' in entry) {
      setFormData({ config_value: entry.config_value, label: entry.label, sort_order: entry.sort_order, name: '', category: 'medical', description: '' });
    } else {
      setFormData({ config_value: '', label: '', sort_order: 0, name: entry.name, category: 'medical', description: entry.description || '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    if (isServices) {
      if (editing) {
        const result = await updateClinicService(editing.id, {
          name: formData.name,
          description: formData.description || undefined,
        });
        if (result.success) {
          setSuccess('Service updated');
          resetForm();
          loadServices();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createClinicService({
          name: formData.name,
          category: formData.category,
          description: formData.description || undefined,
        });
        if (result.success) {
          setSuccess('Service added');
          resetForm();
          loadServices();
        } else {
          setError(result.error);
        }
      }
    } else {
      if (editing) {
        const result = await updateSystemConfig(editing.id, {
          label: formData.label,
          sort_order: formData.sort_order,
        });
        if (result.success) {
          setSuccess('Option updated');
          resetForm();
          loadConfigs();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createSystemConfig({
          config_key: activeGroup,
          config_value: formData.config_value,
          label: formData.label,
          sort_order: formData.sort_order,
        });
        if (result.success) {
          setSuccess('Option added');
          resetForm();
          loadConfigs();
        } else {
          setError(result.error);
        }
      }
    }
    setActionLoading(false);
  };

  const handleDelete = async (entry: ConfigEntry | ServiceEntry) => {
    setActionLoading(true);
    const result = isServices
      ? await deleteClinicService(entry.id)
      : await deleteSystemConfig(entry.id);
    if (result.success) {
      setSuccess(isServices ? 'Service deleted' : 'Option deleted');
      setConfirmDelete(null);
      isServices ? loadServices() : loadConfigs();
    } else {
      setError(result.error);
    }
    setActionLoading(false);
  };

  const handleToggleActive = async (entry: ConfigEntry | ServiceEntry) => {
    const result = isServices
      ? await updateClinicService(entry.id, { is_active: !entry.is_active })
      : await updateSystemConfig(entry.id, { is_active: !entry.is_active });
    if (result.success) {
      isServices ? loadServices() : loadConfigs();
    } else {
      setError(result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading library">
        <div className="spinner"></div>
        <span className="sr-only">Loading library...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">Library Management</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Dismiss">&times;</button>
        </div>
      )}
      {success && (
        <div className="alert-success mb-4" role="status">{success}</div>
      )}

      {/* Group Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveGroup(tab.key); resetForm(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeGroup === tab.key
                ? 'bg-[#1E40AF] text-white'
                : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <p className="text-sm text-[#64748B]">
          {isServices
            ? 'Manage medical, dental, and other services available at the clinic'
            : CONFIG_GROUPS[activeGroup]?.description}
        </p>
      </div>

      {/* Add Button */}
      <div className="mb-4">
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : isServices ? 'Add Service' : `Add ${CONFIG_GROUPS[activeGroup]?.label}`}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="text-subheading text-[#0F172A] mb-4">
            {editing ? (isServices ? 'Edit Service' : 'Edit Option') : (isServices ? 'Add New Service' : 'Add New Option')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isServices ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g. General Consultation"
                  />
                </div>
                {!editing && (
                  <div>
                    <label className="label">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="select-field"
                    >
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    placeholder="Optional description"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!editing && (
                  <div>
                    <label className="label">Value (internal) *</label>
                    <input
                      type="text"
                      required
                      value={formData.config_value}
                      onChange={(e) => setFormData({ ...formData, config_value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="input-field"
                      placeholder="e.g. alumni"
                      pattern="[a-z_]+"
                      title="Lowercase letters and underscores only"
                    />
                  </div>
                )}
                <div>
                  <label className="label">Label (display) *</label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Alumni"
                  />
                </div>
                <div>
                  <label className="label">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={actionLoading} className="btn-primary">
                {actionLoading ? 'Saving...' : editing ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {isServices ? (
                  <>
                    <th scope="col">Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </>
                ) : (
                  <>
                    <th scope="col">Order</th>
                    <th scope="col">Value</th>
                    <th scope="col">Label</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isServices ? (
                services.length === 0 ? null : services.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                    <td className="font-medium">{entry.name}</td>
                    <td>
                      <span className="badge badge-neutral">{entry.category}</span>
                    </td>
                    <td className="text-[#64748B]">{entry.description || '—'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(entry)}
                        className={`badge cursor-pointer ${entry.is_active ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(entry)} className="text-sm text-[#2563EB] hover:underline">Edit</button>
                        <button onClick={() => setConfirmDelete(entry)} className="text-sm text-[#DC2626] hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredConfigs.length === 0 ? null : filteredConfigs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                    <td className="tabular-nums text-[#64748B]">{entry.sort_order}</td>
                    <td className="font-mono text-sm">{entry.config_value}</td>
                    <td className="font-medium">{entry.label}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(entry)}
                        className={`badge cursor-pointer ${entry.is_active ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(entry)} className="text-sm text-[#2563EB] hover:underline">Edit</button>
                        <button onClick={() => setConfirmDelete(entry)} className="text-sm text-[#DC2626] hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(isServices ? services.length === 0 : filteredConfigs.length === 0) && (
          <div className="text-center py-12 text-body text-[#64748B]">
            {isServices ? 'No services configured' : 'No options configured'}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-subheading text-[#0F172A] mb-2">
              {isServices ? 'Delete Service?' : 'Delete Option?'}
            </h3>
            <p className="text-body text-[#64748B] mb-4">
              This will permanently delete <strong>{isServices ? (confirmDelete as ServiceEntry).name : (confirmDelete as ConfigEntry).label}</strong>.
              {isServices ? ' Any queue entries using this service will retain it.' : ' Any records using this value will retain it but it won\'t appear in dropdowns.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading}
                className="btn-danger"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
