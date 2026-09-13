'use client';

import { useState, useEffect } from 'react';
import { fetchDispensingHistory } from './history-actions';

interface DispensingRecord {
  id: string;
  quantity_dispensed: number;
  dispensed_at: string;
  dispensed_by: string;
  prescription_item?: {
    medication_name: string;
    dosage: string;
    frequency: string;
    prescription?: {
      patient?: {
        first_name: string;
        last_name: string;
        employee_student_id: string;
      };
    };
  };
  batch?: {
    batch_number: string;
    medicine?: {
      name: string;
      generic_name?: string;
      form?: string;
      strength?: string;
    };
  };
}

export default function DispensingHistoryPage() {
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [summary, setSummary] = useState({ totalDispensed: 0, uniquePatients: 0, uniqueMedicines: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchDispensingHistory({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      search: search || undefined,
    });
    if (result.success) {
      setRecords(result.data);
      setSummary(result.summary);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilter = () => {
    loadData();
  };

  const handleExport = () => {
    const headers = ['Date', 'Patient', 'University ID', 'Medicine', 'Strength', 'Form', 'Batch', 'Qty Dispensed', 'Dosage', 'Frequency'];
    const rows = records.map((r) => [
      new Date(r.dispensed_at).toLocaleDateString(),
      `${r.prescription_item?.prescription?.patient?.last_name || ''}, ${r.prescription_item?.prescription?.patient?.first_name || ''}`,
      r.prescription_item?.prescription?.patient?.employee_student_id || '',
      r.batch?.medicine?.name || r.prescription_item?.medication_name || '',
      r.batch?.medicine?.strength || '',
      r.batch?.medicine?.form || '',
      r.batch?.batch_number || '',
      r.quantity_dispensed?.toString() || '',
      r.prescription_item?.dosage || '',
      r.prescription_item?.frequency || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispensing-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Dispensing History</h1>
        <button onClick={handleExport} className="btn-secondary text-sm" disabled={records.length === 0}>
          Export CSV
        </button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Medicine or patient..." className="input-field" />
          </div>
          <div className="flex items-end">
            <button onClick={handleFilter} className="btn-primary w-full">Apply Filters</button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card border-l-4 border-l-[#1E40AF]">
          <h3 className="text-sm font-medium text-[#6B7280]">Total Units Dispensed</h3>
          <p className="text-2xl font-bold text-[#1E40AF] tabular-nums">{summary.totalDispensed}</p>
        </div>
        <div className="card border-l-4 border-l-[#059669]">
          <h3 className="text-sm font-medium text-[#6B7280]">Unique Patients</h3>
          <p className="text-2xl font-bold text-[#059669] tabular-nums">{summary.uniquePatients}</p>
        </div>
        <div className="card border-l-4 border-l-[#D97706]">
          <h3 className="text-sm font-medium text-[#6B7280]">Unique Medicines</h3>
          <p className="text-2xl font-bold text-[#D97706] tabular-nums">{summary.uniqueMedicines}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Medicine</th>
                  <th scope="col">Batch</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC]">
                    <td className="whitespace-nowrap">{new Date(r.dispensed_at).toLocaleDateString()}</td>
                    <td>
                      {r.prescription_item?.prescription?.patient?.last_name}, {r.prescription_item?.prescription?.patient?.first_name}
                      <br />
                      <span className="text-xs text-[#94A3B8]">{r.prescription_item?.prescription?.patient?.employee_student_id}</span>
                    </td>
                    <td className="font-medium">
                      {r.batch?.medicine?.name || r.prescription_item?.medication_name}
                      {r.batch?.medicine?.strength && <span className="text-xs text-[#94A3B8] ml-1">{r.batch.medicine.strength}</span>}
                    </td>
                    <td className="text-sm text-[#64748B]">{r.batch?.batch_number || '—'}</td>
                    <td className="tabular-nums">{r.quantity_dispensed}</td>
                    <td className="text-sm">{r.prescription_item?.dosage}</td>
                    <td className="text-sm">{r.prescription_item?.frequency}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-[#64748B]">No dispensing records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
