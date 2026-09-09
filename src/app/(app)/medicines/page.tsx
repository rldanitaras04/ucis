'use client';

import { useState, useEffect } from 'react';
import { createMedicine, updateMedicine, deleteMedicine, fetchMedicines } from './actions';

interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  stock_quantity: number;
  unit_price?: number;
  expiry_date?: string;
  status: string;
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ medicineId: string; medicineName: string } | null>(null);

  const defaultFormData = {
    name: '',
    generic_name: '',
    category: '',
    dosage_form: 'tablet',
    strength: '',
    stock_quantity: 0,
    unit_price: 0,
    expiry_date: '',
  };

  const [formData, setFormData] = useState(defaultFormData);

  const loadMedicines = async () => {
    const result = await fetchMedicines();
    if (result.success) {
      setMedicines(result.data);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    loadMedicines();
    setLoading(false);
  }, []);

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return 'badge-danger';
    if (quantity <= 10) return 'badge-warning';
    return 'badge-success';
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingMedicine(null);
    setShowForm(false);
  };

  const handleEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      generic_name: med.generic_name || '',
      category: med.category || '',
      dosage_form: med.dosage_form || 'tablet',
      strength: med.strength || '',
      stock_quantity: med.stock_quantity,
      unit_price: med.unit_price || 0,
      expiry_date: med.expiry_date || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let result;
    if (editingMedicine) {
      result = await updateMedicine(editingMedicine.id, {
        name: formData.name,
        generic_name: formData.generic_name || undefined,
        category: formData.category || undefined,
        dosage_form: formData.dosage_form || undefined,
        strength: formData.strength || undefined,
        stock_quantity: formData.stock_quantity,
        unit_price: formData.unit_price || undefined,
        expiry_date: formData.expiry_date || undefined,
      });
    } else {
      result = await createMedicine({
        name: formData.name,
        generic_name: formData.generic_name || undefined,
        category: formData.category || undefined,
        dosage_form: formData.dosage_form || undefined,
        strength: formData.strength || undefined,
        stock_quantity: formData.stock_quantity,
        unit_price: formData.unit_price || undefined,
        expiry_date: formData.expiry_date || undefined,
      });
    }

    if (result.success) {
      setSuccess(editingMedicine ? 'Medicine updated successfully' : 'Medicine added successfully');
      resetForm();
      loadMedicines();
    } else {
      setError(result.error);
    }

    setSubmitting(false);
  };

  const handleConfirmDelete = (med: Medicine) => {
    setConfirmDialog({ medicineId: med.id, medicineName: med.name });
  };

  const handleDelete = async () => {
    if (!confirmDialog) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await deleteMedicine(confirmDialog.medicineId);

    if (result.success) {
      setSuccess('Medicine deleted successfully');
      loadMedicines();
    } else {
      setError(result.error);
    }

    setSubmitting(false);
    setConfirmDialog(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading medicines">
        <div className="spinner"></div>
        <span className="sr-only">Loading medicines...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading text-[#0F172A]">Medicines Inventory</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Medicine'}
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
          <h2 className="text-subheading text-[#0F172A] mb-4">
            {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Medicine name"
                  required
                />
              </div>

              <div>
                <label className="label">Generic Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  placeholder="Generic name"
                />
              </div>

              <div>
                <label className="label">Category</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Antibiotic, Analgesic"
                />
              </div>

              <div>
                <label className="label">Dosage Form</label>
                <select
                  className="select-field"
                  value={formData.dosage_form}
                  onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="cream">Cream</option>
                  <option value="ointment">Ointment</option>
                  <option value="drops">Drops</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Strength</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  placeholder="e.g. 500mg"
                />
              </div>

              <div>
                <label className="label">Stock Quantity</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div>
                <label className="label">Unit Price</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="label">Expiry Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Add Medicine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-subheading text-[#0F172A] mb-2">Confirm Delete</h3>
            <p className="text-body text-[#64748B] mb-6">
              Are you sure you want to delete <strong className="text-[#334155]">{confirmDialog.medicineName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete'}
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
                <th scope="col">Name</th>
                <th scope="col">Generic</th>
                <th scope="col">Form</th>
                <th scope="col">Strength</th>
                <th scope="col">Stock</th>
                <th scope="col">Expiry</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {medicines.map((med) => (
                <tr key={med.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-medium">{med.name}</td>
                  <td>{med.generic_name || 'N/A'}</td>
                  <td>{med.dosage_form || 'N/A'}</td>
                  <td>{med.strength || 'N/A'}</td>
                  <td>
                    <span className={`badge ${getStockStatus(med.stock_quantity)} tabular-nums`}>
                      {med.stock_quantity}
                    </span>
                  </td>
                  <td>
                    {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(med)}
                        className="btn-secondary text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(med)}
                        className="btn-danger text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {medicines.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No medicines found
          </div>
        )}
      </div>
    </div>
  );
}
