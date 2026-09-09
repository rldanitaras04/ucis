'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  const fetchMedicines = async () => {
    const { data, error: fetchError } = await supabase
      .from('medicines')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError('Failed to fetch medicines inventory');
      return;
    }

    setMedicines(data || []);
  };

  useEffect(() => {
    fetchMedicines();
    setLoading(false);
  }, []);

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return 'bg-red-100 text-red-800';
    if (quantity <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Medicines Inventory</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {medicines.map((med) => (
              <tr key={med.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {med.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {med.generic_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {med.dosage_form || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {med.strength || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStockStatus(med.stock_quantity)}`}>
                    {med.stock_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {medicines.length === 0 && (
          <div className="text-center py-8 text-gray-500">No medicines found</div>
        )}
      </div>
    </div>
  );
}
