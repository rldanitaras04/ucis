'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchInventoryReport } from '@/app/(app)/dispensing/history-actions';

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
  stock_value: number;
  batch_count: number;
  near_expiry_batches: number;
  expired_batches: number;
}

export default function InventoryReportPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [summary, setSummary] = useState({
    totalMedicines: 0,
    lowStockCount: 0,
    nearExpiryCount: 0,
    expiredCount: 0,
    totalStockValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'near_expiry' | 'expired'>('all');

  useEffect(() => {
    async function load() {
      const result = await fetchInventoryReport();
      if (result.success) {
        setMedicines(result.data.medicines);
        setSummary({
          totalMedicines: result.data.totalMedicines,
          lowStockCount: result.data.lowStockCount,
          nearExpiryCount: result.data.nearExpiryCount,
          expiredCount: result.data.expiredCount,
          totalStockValue: result.data.totalStockValue,
        });
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredMedicines = medicines.filter((med) => {
    if (filter === 'low_stock') return med.total_stock <= 10;
    if (filter === 'near_expiry') return med.near_expiry_batches > 0;
    if (filter === 'expired') return med.expired_batches > 0;
    return true;
  });

  const handleExport = () => {
    const headers = ['Name', 'Generic', 'Category', 'Form', 'Strength', 'Manufacturer', 'Total Stock', 'Batches', 'Stock Value', 'Near Expiry Batches', 'Expired Batches', 'Status'];
    const rows = filteredMedicines.map((med) => [
      med.name,
      med.generic_name || '',
      med.category || '',
      med.form || '',
      med.strength || '',
      med.manufacturer || '',
      med.total_stock.toString(),
      med.batch_count.toString(),
      med.stock_value.toFixed(2),
      med.near_expiry_batches.toString(),
      med.expired_batches.toString(),
      med.total_stock <= 0 ? 'Out of Stock' : med.total_stock <= 10 ? 'Low Stock' : 'OK',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStockBadge = (qty: number) => {
    if (qty <= 0) return 'badge-danger';
    if (qty <= 10) return 'badge-warning';
    return 'badge-success';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Inventory Report</h1>
        <div className="flex gap-2">
          <Link href="/medicines" className="btn-secondary text-sm">Manage Inventory</Link>
          <button onClick={handleExport} className="btn-primary text-sm" disabled={filteredMedicines.length === 0}>Export CSV</button>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <button onClick={() => setFilter('all')} className={`card border-l-4 text-left ${filter === 'all' ? 'border-l-[#1E40AF] bg-[#EFF6FF]' : 'border-l-[#E5E7EB]'}`}>
          <h3 className="text-xs font-medium text-[#6B7280]">Total Medicines</h3>
          <p className="text-2xl font-bold text-[#111827] tabular-nums">{summary.totalMedicines}</p>
        </button>
        <button onClick={() => setFilter('low_stock')} className={`card border-l-4 text-left ${filter === 'low_stock' ? 'border-l-[#D97706] bg-[#FFFBEB]' : 'border-l-[#E5E7EB]'}`}>
          <h3 className="text-xs font-medium text-[#6B7280]">Low Stock</h3>
          <p className="text-2xl font-bold text-[#D97706] tabular-nums">{summary.lowStockCount}</p>
        </button>
        <button onClick={() => setFilter('near_expiry')} className={`card border-l-4 text-left ${filter === 'near_expiry' ? 'border-l-[#D97706] bg-[#FFFBEB]' : 'border-l-[#E5E7EB]'}`}>
          <h3 className="text-xs font-medium text-[#6B7280]">Near Expiry</h3>
          <p className="text-2xl font-bold text-[#D97706] tabular-nums">{summary.nearExpiryCount}</p>
        </button>
        <button onClick={() => setFilter('expired')} className={`card border-l-4 text-left ${filter === 'expired' ? 'border-l-[#DC2626] bg-[#FEF2F2]' : 'border-l-[#E5E7EB]'}`}>
          <h3 className="text-xs font-medium text-[#6B7280]">Expired</h3>
          <p className="text-2xl font-bold text-[#DC2626] tabular-nums">{summary.expiredCount}</p>
        </button>
        <div className="card border-l-4 border-l-[#059669]">
          <h3 className="text-xs font-medium text-[#6B7280]">Stock Value</h3>
          <p className="text-2xl font-bold text-[#059669] tabular-nums">₱{summary.totalStockValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Table */}
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
                <th scope="col">Batches</th>
                <th scope="col">Value</th>
                <th scope="col">Expiry Alerts</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredMedicines.map((med) => (
                <tr key={med.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-medium">{med.name}</td>
                  <td className="text-sm text-[#64748B]">{med.generic_name || '—'}</td>
                  <td>{med.form || '—'}</td>
                  <td>{med.strength || '—'}</td>
                  <td><span className={`badge ${getStockBadge(med.total_stock)} tabular-nums`}>{med.total_stock}</span></td>
                  <td className="tabular-nums">{med.batch_count}</td>
                  <td className="tabular-nums">₱{med.stock_value.toFixed(2)}</td>
                  <td>
                    {med.near_expiry_batches > 0 && <span className="badge badge-warning mr-1">{med.near_expiry_batches} expiring</span>}
                    {med.expired_batches > 0 && <span className="badge badge-danger">{med.expired_batches} expired</span>}
                    {med.near_expiry_batches === 0 && med.expired_batches === 0 && <span className="text-[#94A3B8]">—</span>}
                  </td>
                  <td>
                    {med.total_stock <= 0 ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : med.total_stock <= 10 ? (
                      <span className="badge badge-warning">Low Stock</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredMedicines.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-[#64748B]">No medicines match the filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
