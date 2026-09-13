'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Pill, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { dispenseMedication, fetchActivePrescriptions, fetchMedicineBatches } from './actions';

interface MedicineRef {
  id: string;
  name: string;
  generic_name?: string;
  form?: string;
  strength?: string;
}

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  quantity: number;
  medicine?: MedicineRef;
  medicine_id?: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  status: string;
  prescribed_date: string;
  patient?: { id: string; first_name: string; last_name: string; employee_student_id: string | null };
  items?: PrescriptionItem[];
}

interface MedicineBatch {
  id: string;
  batch_number: string;
  quantity: number;
  unit_price: number | null;
  expiry_date: string;
  medicine_id: string;
  medicine?: MedicineRef;
}

interface DispenseLine {
  prescriptionItemId: string;
  medicationName: string;
  requestedQty: number;
  selectedBatchId: string;
  dispenseQty: number;
  maxQty: number;
  status: 'pending' | 'dispensed' | 'error';
  error?: string;
}

export default function DispensingPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicineBatches, setMedicineBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkLines, setBulkLines] = useState<DispenseLine[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [singleItem, setSingleItem] = useState<PrescriptionItem | null>(null);
  const [singleRx, setSingleRx] = useState<Prescription | null>(null);
  const [singleBatch, setSingleBatch] = useState('');
  const [singleQty, setSingleQty] = useState(1);

  const loadData = async () => {
    const [rxResult, batchResult] = await Promise.all([
      fetchActivePrescriptions(),
      fetchMedicineBatches(),
    ]);
    if (rxResult.success) setPrescriptions(rxResult.data);
    if (batchResult.success) setMedicineBatches(batchResult.data);
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, []);

  const allItems = useMemo(() => {
    const items: { rx: Prescription; item: PrescriptionItem }[] = [];
    for (const rx of prescriptions) {
      for (const item of rx.items || []) {
        items.push({ rx, item });
      }
    }
    return items;
  }, [prescriptions]);

  const allItemIds = useMemo(() => allItems.map(i => i.item.id), [allItems]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === allItemIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allItemIds));
    }
  };

  const getMatchingBatches = (item: PrescriptionItem) => {
    if (item.medicine_id) {
      return medicineBatches.filter(b => b.medicine_id === item.medicine_id);
    }
    return medicineBatches.filter(b =>
      b.medicine?.name?.toLowerCase().includes(item.medication_name.toLowerCase()) ||
      b.medicine?.generic_name?.toLowerCase().includes(item.medication_name.toLowerCase())
    );
  };

  const openBulkPanel = () => {
    const lines: DispenseLine[] = allItems
      .filter(i => selected.has(i.item.id))
      .map(i => {
        const batches = getMatchingBatches(i.item);
        const bestBatch = batches.length === 1 ? batches[0] : null;
        return {
          prescriptionItemId: i.item.id,
          medicationName: i.item.medication_name,
          requestedQty: i.item.quantity || 1,
          selectedBatchId: bestBatch?.id || '',
          dispenseQty: bestBatch ? Math.min(i.item.quantity || 1, bestBatch.quantity) : 1,
          maxQty: bestBatch?.quantity || 0,
          status: 'pending' as const,
        };
      });
    setBulkLines(lines);
    setShowBulkPanel(true);
  };

  const updateBulkLine = (index: number, updates: Partial<DispenseLine>) => {
    setBulkLines(prev => {
      const next = [...prev];
      const line = { ...next[index], ...updates };
      if (updates.selectedBatchId !== undefined) {
        const batch = medicineBatches.find(b => b.id === updates.selectedBatchId);
        line.maxQty = batch?.quantity || 0;
        line.dispenseQty = Math.min(line.requestedQty, line.maxQty);
      }
      next[index] = line;
      return next;
    });
  };

  const processBulkDispense = async () => {
    setBulkProcessing(true);
    let dispensed = 0;
    let failed = 0;

    for (let i = 0; i < bulkLines.length; i++) {
      const line = bulkLines[i];
      if (line.status !== 'pending' || !line.selectedBatchId) {
        if (!line.selectedBatchId) {
          updateBulkLine(i, { status: 'error', error: 'No batch selected' });
          failed++;
        }
        continue;
      }

      const result = await dispenseMedication({
        prescription_item_id: line.prescriptionItemId,
        medicine_batch_id: line.selectedBatchId,
        quantity: line.dispenseQty,
      });

      if (result.success) {
        updateBulkLine(i, { status: 'dispensed' });
        dispensed++;
      } else {
        updateBulkLine(i, { status: 'error', error: result.error || 'Failed' });
        failed++;
      }
    }

    if (dispensed > 0) {
      setSuccess(`${dispensed} of ${bulkLines.length} dispensed successfully${failed > 0 ? `, ${failed} failed` : ''}`);
      setSelected(new Set());
      await loadData();
    } else {
      setError(`All ${failed} items failed to dispense`);
    }
    setBulkProcessing(false);
  };

  const openSingleDispense = (rx: Prescription, item: PrescriptionItem) => {
    setSingleRx(rx);
    setSingleItem(item);
    setSingleBatch('');
    setSingleQty(1);
  };

  const handleSingleDispense = async () => {
    if (!singleItem || !singleBatch) return;
    setActionLoading(singleItem.id);
    setError(null);
    const batch = medicineBatches.find(b => b.id === singleBatch);
    const qty = batch && singleQty > batch.quantity ? batch.quantity : singleQty;
    const result = await dispenseMedication({
      prescription_item_id: singleItem.id,
      medicine_batch_id: singleBatch,
      quantity: qty,
    });
    if (result.success) {
      if (batch && singleQty > batch.quantity) {
        setSuccess(`Dispensed ${qty} (partial — batch only had ${batch.quantity})`);
      } else {
        setSuccess('Medication dispensed successfully');
      }
      setSingleItem(null);
      setSingleRx(null);
      await loadData();
    } else {
      setError(result.error || 'Failed to dispense');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
            <Pill size={22} className="text-[#1E40AF]" />
          </div>
          <h1 className="text-heading text-[#0F172A]">Dispensing</h1>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-4 flex items-center gap-2" role="alert">
          <WarningCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert-success mb-4 flex items-center gap-2" role="status">
          <CheckCircle size={18} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-[#EEF2FF] border border-[#BFDBFE] rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-[#1E40AF] font-medium">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-sm">Clear</button>
            <button onClick={openBulkPanel} className="btn-primary text-sm">Dispense Selected</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <input type="checkbox" checked={selected.size === allItemIds.length && allItemIds.length > 0} onChange={toggleSelectAll}
                    className="rounded border-[#D1D5DB] text-[#1E40AF] focus:ring-[#1E40AF]" />
                </th>
                <th scope="col">Patient</th>
                <th scope="col">Medication</th>
                <th scope="col">Dosage</th>
                <th scope="col">Frequency</th>
                <th scope="col">Qty</th>
                <th scope="col">Stock</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {allItems.map(({ rx, item }) => {
                const batches = getMatchingBatches(item);
                return (
                  <tr key={item.id} className={`hover:bg-[#F8FAFC] ${selected.has(item.id) ? 'bg-[#F0F7FF]' : ''}`}>
                    <td>
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="rounded border-[#D1D5DB] text-[#1E40AF] focus:ring-[#1E40AF]" />
                    </td>
                    <td>
                      <span className="font-medium text-[#0F172A]">{rx.patient?.last_name}, {rx.patient?.first_name}</span>
                      <br />
                      <span className="text-xs text-[#94A3B8]">{rx.patient?.employee_student_id}</span>
                    </td>
                    <td className="font-medium">
                      {item.medicine ? (
                        <div>
                          <div>{item.medicine.name}</div>
                          <div className="text-xs text-[#94A3B8]">{item.medicine.strength} {item.medicine.form}</div>
                        </div>
                      ) : item.medication_name}
                    </td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                    <td className="tabular-nums">{item.quantity}</td>
                    <td>
                      {batches.length === 0 ? (
                        <span className="badge badge-danger">No stock</span>
                      ) : (
                        <span className="badge badge-success">{batches.length} batch{batches.length > 1 ? 'es' : ''}</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => openSingleDispense(rx, item)} disabled={batches.length === 0}
                        className="btn-primary py-1 px-3 text-sm" style={{ display: singleItem?.id === item.id ? 'none' : undefined }}>
                        Dispense
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {allItems.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No active prescriptions to dispense
          </div>
        )}
      </div>

      {singleItem && singleRx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-subheading text-[#0F172A]">Dispense Medication</h2>
            <div className="text-sm text-[#64748B]">
              <p><span className="font-medium text-[#0F172A]">{singleItem.medication_name}</span> — {singleItem.dosage}</p>
              <p>{singleRx.patient?.last_name}, {singleRx.patient?.first_name}</p>
            </div>
            <div>
              <label className="label">Select Batch *</label>
              <select value={singleBatch} onChange={e => { setSingleBatch(e.target.value); setSingleQty(1); }} className="input-field w-full">
                <option value="">Select batch...</option>
                {getMatchingBatches(singleItem).map(batch => (
                  <option key={batch.id} value={batch.id} disabled={batch.quantity === 0}>
                    {batch.batch_number} — Qty: {batch.quantity}, Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {getMatchingBatches(singleItem).length === 0 && (
                <p className="text-xs text-[#DC2626] mt-1">No matching batches found</p>
              )}
            </div>
            {singleBatch && (
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" max={medicineBatches.find(b => b.id === singleBatch)?.quantity || 999}
                  value={singleQty} onChange={e => setSingleQty(Number(e.target.value))} className="input-field w-full" />
                {singleQty > (medicineBatches.find(b => b.id === singleBatch)?.quantity || 0) && (
                  <p className="text-xs text-[#D97706] mt-1">Partial dispense: will dispense available quantity only</p>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setSingleItem(null); setSingleRx(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSingleDispense} disabled={!singleBatch || actionLoading === singleItem.id} className="btn-primary">
                {actionLoading === singleItem.id ? 'Dispensing...' : 'Confirm Dispensing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
              <h2 className="text-subheading text-[#0F172A]">Dispense {bulkLines.length} Item{bulkLines.length !== 1 ? 's' : ''}</h2>
              <button onClick={() => setShowBulkPanel(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#0F172A]"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {bulkLines.map((line, idx) => {
                const batches = medicineBatches.filter(b => {
                  const item = allItems.find(i => i.item.id === line.prescriptionItemId)?.item;
                  if (!item) return false;
                  if (item.medicine_id) return b.medicine_id === item.medicine_id;
                  return b.medicine?.name?.toLowerCase().includes(item.medication_name.toLowerCase()) ||
                    b.medicine?.generic_name?.toLowerCase().includes(item.medication_name.toLowerCase());
                });
                return (
                  <div key={line.prescriptionItemId} className={`border rounded-lg p-4 ${line.status === 'dispensed' ? 'border-[#059669] bg-[#F0FDF4]' : line.status === 'error' ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#E2E8F0]'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-[#0F172A]">{line.medicationName}</span>
                        <span className="text-sm text-[#64748B] ml-2">Qty needed: {line.requestedQty}</span>
                      </div>
                      {line.status === 'dispensed' && <span className="badge badge-success">Dispensed</span>}
                      {line.status === 'error' && <span className="badge badge-danger">{line.error}</span>}
                    </div>
                    {line.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Batch *</label>
                          <select value={line.selectedBatchId} onChange={e => updateBulkLine(idx, { selectedBatchId: e.target.value })}
                            className="input-field w-full text-sm">
                            <option value="">Select batch...</option>
                            {batches.map(b => (
                              <option key={b.id} value={b.id} disabled={b.quantity === 0}>
                                {b.batch_number} — Qty: {b.quantity}, Exp: {new Date(b.expiry_date).toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                          {batches.length === 0 && <p className="text-xs text-[#DC2626] mt-1">No matching batches</p>}
                        </div>
                        <div>
                          <label className="label text-xs">Quantity</label>
                          <input type="number" min="1" max={line.maxQty} value={line.dispenseQty}
                            onChange={e => updateBulkLine(idx, { dispenseQty: Number(e.target.value) })} className="input-field w-full text-sm" />
                          {line.dispenseQty < line.requestedQty && line.maxQty > 0 && (
                            <p className="text-xs text-[#D97706] mt-1">Partial: {line.dispenseQty} of {line.requestedQty}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowBulkPanel(false)} className="btn-secondary">Cancel</button>
              <button onClick={processBulkDispense} disabled={bulkProcessing || bulkLines.every(l => l.status !== 'pending')}
                className="btn-primary">
                {bulkProcessing ? 'Processing...' : `Dispense All (${bulkLines.filter(l => l.status === 'pending').length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
