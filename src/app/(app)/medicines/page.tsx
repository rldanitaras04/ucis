'use client';

import { useState, useEffect } from 'react';
import { createMedicine, updateMedicine, deleteMedicine, fetchMedicines, addBatch, updateBatch } from './actions';

interface MedicineBatch {
  id: string;
  batch_number: string;
  quantity: number;
  unit_price: number | null;
  expiry_date: string;
  is_active: boolean;
}

interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  category?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  is_active: boolean;
  total_stock: number;
  nearest_expiry: string | null;
  unit_price: number | null;
  batch_count: number;
  batches?: MedicineBatch[];
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState<string | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ medicineId: string; medicineName: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');

  const defaultMedicineForm = {
    name: '',
    generic_name: '',
    category: '',
    form: 'tablet',
    strength: '',
    manufacturer: '',
  };

  const defaultBatchForm = {
    batch_number: '',
    quantity: 100,
    unit_price: 0,
    expiry_date: '',
    manufactured_date: '',
  };

  const [medicineForm, setMedicineForm] = useState(defaultMedicineForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);

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

  const getStockBadge = (qty: number) => {
    if (qty <= 0) return 'badge-danger';
    if (qty <= 10) return 'badge-warning';
    return 'badge-success';
  };

  const getExpiryBadge = (date: string | null) => {
    if (!date) return null;
    const daysUntil = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0) return { label: 'Expired', className: 'badge-danger' };
    if (daysUntil <= 30) return { label: `${daysUntil}d`, className: 'badge-danger' };
    if (daysUntil <= 90) return { label: `${daysUntil}d`, className: 'badge-warning' };
    return null;
  };

  const resetMedicineForm = () => {
    setMedicineForm(defaultMedicineForm);
    setEditingMedicine(null);
    setShowForm(false);
  };

  const handleEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setMedicineForm({
      name: med.name,
      generic_name: med.generic_name || '',
      category: med.category || '',
      form: med.form || 'tablet',
      strength: med.strength || '',
      manufacturer: med.manufacturer || '',
    });
    setShowForm(true);
  };

  const handleMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let result;
    if (editingMedicine) {
      result = await updateMedicine(editingMedicine.id, {
        name: medicineForm.name,
        generic_name: medicineForm.generic_name || undefined,
        category: medicineForm.category || undefined,
        form: medicineForm.form || undefined,
        strength: medicineForm.strength || undefined,
        manufacturer: medicineForm.manufacturer || undefined,
      });
    } else {
      result = await createMedicine({
        name: medicineForm.name,
        generic_name: medicineForm.generic_name || undefined,
        category: medicineForm.category || undefined,
        form: medicineForm.form || undefined,
        strength: medicineForm.strength || undefined,
        manufacturer: medicineForm.manufacturer || undefined,
      });
    }

    if (result.success) {
      setSuccess(editingMedicine ? 'Medicine updated' : 'Medicine added');
      resetMedicineForm();
      loadMedicines();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBatchForm) return;
    setSubmitting(true);
    setError(null);

    const result = await addBatch({
      medicine_id: showBatchForm,
      batch_number: batchForm.batch_number,
      quantity: batchForm.quantity,
      unit_price: batchForm.unit_price || undefined,
      expiry_date: batchForm.expiry_date,
      manufactured_date: batchForm.manufactured_date || undefined,
    });

    if (result.success) {
      setSuccess('Batch added');
      setShowBatchForm(null);
      setBatchForm(defaultBatchForm);
      loadMedicines();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirmDialog) return;
    setSubmitting(true);
    const result = await deleteMedicine(confirmDialog.medicineId);
    if (result.success) {
      setSuccess('Medicine deleted');
      loadMedicines();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
    setConfirmDialog(null);
  };

  const handleToggleBatchActive = async (batch: MedicineBatch) => {
    const result = await updateBatch(batch.id, { is_active: !batch.is_active });
    if (result.success) {
      loadMedicines();
    }
  };

  const categories = Array.from(new Set(medicines.map(m => m.category).filter(Boolean))).sort();
  const forms = Array.from(new Set(medicines.map(m => m.form).filter(Boolean))).sort();

  const filteredMedicines = medicines.filter(med => {
    const matchSearch = !search ||
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = !categoryFilter || med.category === categoryFilter;
    const matchForm = !formFilter || med.form === formFilter;
    return matchSearch && matchCategory && matchForm;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading text-[#0F172A]">Medicine Inventory</h1>
        <button onClick={() => { resetMedicineForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Medicine'}
        </button>
      </div>

      {error && <div className="alert-error mb-4" role="alert">{error}<button onClick={() => setError(null)} className="float-right font-bold">&times;</button></div>}
      {success && <div className="alert-success mb-4">{success}</div>}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or generic name..." className="input-field" />
          </div>
          <div>
            <label className="label">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select-field">
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Form</label>
            <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} className="select-field">
              <option value="">All forms</option>
              {forms.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setSearch(''); setCategoryFilter(''); setFormFilter(''); }} className="btn-secondary w-full">Clear Filters</button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-subheading text-[#0F172A] mb-4">{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
          <form onSubmit={handleMedicineSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input-field" value={medicineForm.name} onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Generic Name</label>
                <input type="text" className="input-field" value={medicineForm.generic_name} onChange={(e) => setMedicineForm({ ...medicineForm, generic_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Category</label>
                <input type="text" className="input-field" value={medicineForm.category} onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })} placeholder="e.g. analgesic, antibiotic" />
              </div>
              <div>
                <label className="label">Form</label>
                <select className="select-field" value={medicineForm.form} onChange={(e) => setMedicineForm({ ...medicineForm, form: e.target.value })}>
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="ointment">Ointment</option>
                  <option value="drops">Drops</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Strength</label>
                <input type="text" className="input-field" value={medicineForm.strength} onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })} placeholder="e.g. 500mg" />
              </div>
              <div>
                <label className="label">Manufacturer</label>
                <input type="text" className="input-field" value={medicineForm.manufacturer} onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetMedicineForm} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editingMedicine ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}

      {showBatchForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-subheading text-[#0F172A] mb-4">Add Stock Batch</h2>
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Batch Number *</label>
                <input type="text" className="input-field" value={batchForm.batch_number} onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} required />
              </div>
              <div>
                <label className="label">Quantity *</label>
                <input type="number" className="input-field tabular-nums" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: parseInt(e.target.value) || 0 })} min="0" required />
              </div>
              <div>
                <label className="label">Unit Price</label>
                <input type="number" className="input-field tabular-nums" value={batchForm.unit_price} onChange={(e) => setBatchForm({ ...batchForm, unit_price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
              </div>
              <div>
                <label className="label">Expiry Date *</label>
                <input type="date" className="input-field" value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Manufactured Date</label>
                <input type="date" className="input-field" value={batchForm.manufactured_date} onChange={(e) => setBatchForm({ ...batchForm, manufactured_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowBatchForm(null); setBatchForm(defaultBatchForm); }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Batch'}</button>
            </div>
          </form>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-subheading text-[#0F172A] mb-2">Confirm Delete</h3>
            <p className="text-body text-[#64748B] mb-6">Delete <strong className="text-[#334155]">{confirmDialog.medicineName}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="btn-danger" disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
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
                <th scope="col">Batches</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredMedicines.map((med) => (
                <>
                  <tr key={med.id} className="hover:bg-[#F8FAFC]">
                    <td className="font-medium">{med.name}</td>
                    <td>{med.generic_name || '—'}</td>
                    <td>{med.form || '—'}</td>
                    <td>{med.strength || '—'}</td>
                    <td>
                      <span className={`badge ${getStockBadge(med.total_stock)} tabular-nums`}>
                        {med.total_stock}
                      </span>
                    </td>
                    <td>
                      {med.nearest_expiry ? (
                        <div className="flex items-center gap-2">
                          <span>{new Date(med.nearest_expiry).toLocaleDateString()}</span>
                          {(() => {
                            const badge = getExpiryBadge(med.nearest_expiry);
                            return badge ? <span className={`badge text-xs ${badge.className}`}>{badge.label}</span> : null;
                          })()}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <button onClick={() => setExpandedRow(expandedRow === med.id ? null : med.id)} className="text-[#1E40AF] hover:underline text-sm">
                        {med.batch_count}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <button onClick={() => { setBatchForm(defaultBatchForm); setShowBatchForm(med.id); }} className="btn-secondary text-xs px-2 py-1">+ Stock</button>
                        <button onClick={() => handleEdit(med)} className="btn-secondary text-xs px-2 py-1">Edit</button>
                        <button onClick={() => setConfirmDialog({ medicineId: med.id, medicineName: med.name })} className="text-[#DC2626] hover:text-[#B91C1C] text-xs font-medium px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === med.id && med.batches && med.batches.length > 0 && (
                    <tr key={`${med.id}-batches`}>
                      <td colSpan={9} className="bg-[#F8FAFC] px-6 py-3">
                        <div className="text-xs space-y-1">
                          {med.batches.map((batch) => (
                            <div key={batch.id} className={`flex items-center gap-4 py-1 ${!batch.is_active ? 'opacity-50' : ''}`}>
                              <span className="font-medium">{batch.batch_number}</span>
                              <span>Qty: {batch.quantity}</span>
                              {batch.unit_price != null && <span>₱{Number(batch.unit_price).toFixed(2)}</span>}
                              <span>Exp: {new Date(batch.expiry_date).toLocaleDateString()}</span>
                              {!batch.is_active && <span className="badge badge-neutral">inactive</span>}
                              <button onClick={() => handleToggleBatchActive(batch)} className="text-[#1E40AF] hover:underline">
                                {batch.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMedicines.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            {medicines.length === 0 ? 'No medicines found' : 'No medicines match the filters'}
          </div>
        )}
      </div>
    </div>
  );
}
