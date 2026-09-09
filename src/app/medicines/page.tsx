'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Medicine {
  id: string;
  generic_name: string;
  brand_name?: string;
  dosage_form: string;
  strength: string;
  unit: string;
  is_active: boolean;
  reorder_threshold: number;
  medicine_batches?: { quantity: number; expiration_date: string; batch_number: string; status: string }[];
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    generic_name: '', brand_name: '', dosage_form: 'tablet', strength: '', unit: 'pcs', reorder_threshold: '10',
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadMedicines(); }, []);

  const loadMedicines = async () => {
    const { data } = await supabase
      .from('medicines')
      .select('*, medicine_batches(quantity, expiration_date, batch_number, status)')
      .order('generic_name');
    setMedicines(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('medicines').insert({
        generic_name: formData.generic_name,
        brand_name: formData.brand_name || null,
        dosage_form: formData.dosage_form,
        strength: formData.strength,
        unit: formData.unit,
        reorder_threshold: parseInt(formData.reorder_threshold),
        is_active: true,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Medicine added');
      setShowForm(false);
      setFormData({ generic_name: '', brand_name: '', dosage_form: 'tablet', strength: '', unit: 'pcs', reorder_threshold: '10' });
      loadMedicines();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalStock = (med: Medicine) => {
    return med.medicine_batches?.filter(b => b.status === 'active').reduce((sum, b) => sum + b.quantity, 0) || 0;
  };

  const isLowStock = (med: Medicine) => {
    return getTotalStock(med) <= med.reorder_threshold;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Medicines & Inventory</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Medicine'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Medicine</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Generic Name *</label>
                <input name="generic_name" required className="input-field" value={formData.generic_name} onChange={(e) => setFormData({...formData, generic_name: e.target.value})} />
              </div>
              <div>
                <label className="label">Brand Name</label>
                <input name="brand_name" className="input-field" value={formData.brand_name} onChange={(e) => setFormData({...formData, brand_name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="label">Dosage Form *</label>
                <select name="dosage_form" className="input-field" value={formData.dosage_form} onChange={(e) => setFormData({...formData, dosage_form: e.target.value})}>
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="cream">Cream</option>
                  <option value="drops">Drops</option>
                  <option value="inhaler">Inhaler</option>
                </select>
              </div>
              <div>
                <label className="label">Strength *</label>
                <input name="strength" required className="input-field" placeholder="e.g., 500mg" value={formData.strength} onChange={(e) => setFormData({...formData, strength: e.target.value})} />
              </div>
              <div>
                <label className="label">Unit</label>
                <select name="unit" className="input-field" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                  <option value="pcs">Pieces</option>
                  <option value="bottles">Bottles</option>
                  <option value="tubes">Tubes</option>
                </select>
              </div>
              <div>
                <label className="label">Reorder Threshold</label>
                <input name="reorder_threshold" type="number" className="input-field" value={formData.reorder_threshold} onChange={(e) => setFormData({...formData, reorder_threshold: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding...' : 'Add Medicine'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : medicines.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No medicines in inventory</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Generic Name</th>
                  <th>Brand</th>
                  <th>Form</th>
                  <th>Strength</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => {
                  const stock = getTotalStock(med);
                  const low = isLowStock(med);
                  return (
                    <tr key={med.id}>
                      <td className="font-medium">{med.generic_name}</td>
                      <td>{med.brand_name || '-'}</td>
                      <td className="capitalize">{med.dosage_form}</td>
                      <td>{med.strength}</td>
                      <td className={low ? 'text-red-600 font-bold' : ''}>
                        {stock} {med.unit}
                        {low && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1 rounded">LOW</span>}
                      </td>
                      <td>
                        <span className={`badge ${med.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {med.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
