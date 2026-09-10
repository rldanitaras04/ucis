'use client';

import { useState, useEffect } from 'react';
import { fetchOdontograms, createOdontogram, fetchPatientOdontogramHistory } from './actions';
import PatientSearch from '@/components/PatientSearch';
import { PatientSearchResult } from '@/app/(app)/actions/patients';
import { Plus, Eye, Calendar, User } from '@phosphor-icons/react';

const TOOTH_DATA_DEFAULT = {
  permanent: Array.from({ length: 32 }, (_, i) => ({
    number: i + 1,
    status: 'healthy',
    treatments: [],
  })),
};

export default function OdontogramPage() {
  const [odontograms, setOdontograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [toothData, setToothData] = useState(TOOTH_DATA_DEFAULT);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);

  useEffect(() => {
    loadOdontograms();
  }, []);

  const loadOdontograms = async () => {
    setLoading(true);
    const result = await fetchOdontograms();
    if (result.success) {
      setOdontograms(result.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setCreating(true);
    setError(null);

    const result = await createOdontogram({
      patient_id: selectedPatient.id,
      encounter_id: '00000000-0000-0000-0000-000000000000', // Placeholder - should be linked to actual encounter
      tooth_data: toothData,
      notes: notes || undefined,
    });

    if (result.success) {
      setSuccess('Odontogram created successfully');
      setShowCreate(false);
      setSelectedPatient(null);
      setToothData(TOOTH_DATA_DEFAULT);
      setNotes('');
      loadOdontograms();
    } else {
      setError(result.error || 'Failed to create odontogram');
    }
    setCreating(false);
  };

  const handlePatientSelect = async (patientId: string, patient?: PatientSearchResult) => {
    if (patient) {
      setSelectedPatient(patient);
      // Load patient's odontogram history
      const historyResult = await fetchPatientOdontogramHistory(patientId);
      if (historyResult.success) {
        setPatientHistory(historyResult.data);
      }
    }
  };

  const updateToothStatus = (toothNumber: number, status: string) => {
    setToothData(prev => ({
      ...prev,
      permanent: prev.permanent.map(t =>
        t.number === toothNumber ? { ...t, status } : t
      ),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-[#ECFDF5] border-[#059669]';
      case 'decayed': return 'bg-[#FEF2F2] border-[#DC2626]';
      case 'filled': return 'bg-[#EFF6FF] border-[#2563EB]';
      case 'extracted': return 'bg-[#F3F4F6] border-[#9CA3AF]';
      case 'crown': return 'bg-[#FFFBEB] border-[#D97706]';
      case 'bridge': return 'bg-[#F5F3FF] border-[#7C3AED]';
      case 'implant': return 'bg-[#ECFDF5] border-[#059669]';
      default: return 'bg-white border-[#E5E7EB]';
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading text-[#0F172A]">Odontogram</h1>
          <p className="text-body text-[#64748B]">Dental chart records and history</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Odontogram
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="alert">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-subheading text-[#0F172A]">New Odontogram</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="label">Patient *</label>
                <PatientSearch
                  id="odontogram-patient-search"
                  label="Search Patient"
                  value={selectedPatient?.id || ''}
                  onChange={handlePatientSelect}
                  placeholder="Search by name or patient ID..."
                />
              </div>

              {selectedPatient && patientHistory.length > 0 && (
                <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-[#0369A1] mb-2">Previous Odontograms</h3>
                  <div className="space-y-2">
                    {patientHistory.map((record) => (
                      <div key={record.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                        {record.notes && (
                          <span className="text-[#9CA3AF] truncate max-w-[200px]">{record.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tooth Chart */}
              <div>
                <label className="label mb-3">Tooth Chart</label>
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-2">
                  {toothData.permanent.map((tooth) => (
                    <button
                      key={tooth.number}
                      onClick={() => {
                        const statuses = ['healthy', 'decayed', 'filled', 'extracted', 'crown', 'bridge', 'implant'];
                        const currentIndex = statuses.indexOf(tooth.status);
                        const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                        updateToothStatus(tooth.number, nextStatus);
                      }}
                      className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-colors ${getStatusColor(tooth.status)}`}
                      title={`Tooth ${tooth.number}: ${tooth.status}`}
                    >
                      {tooth.number}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-[#ECFDF5] border-[#059669]" />
                    <span>Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-[#FEF2F2] border-[#DC2626]" />
                    <span>Decayed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-[#EFF6FF] border-[#2563EB]" />
                    <span>Filled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-[#F3F4F6] border-[#9CA3AF]" />
                    <span>Extracted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-[#FFFBEB] border-[#D97706]" />
                    <span>Crown</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !selectedPatient} className="btn-primary">
                {creating ? 'Creating...' : 'Create Odontogram'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Odontogram List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
          </div>
        ) : odontograms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#9CA3AF]">No odontograms found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Patient</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Encounter</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Notes</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {odontograms.map((record) => (
                  <tr key={record.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {record.patient?.first_name?.charAt(0)}{record.patient?.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {record.patient?.last_name}, {record.patient?.first_name}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{record.patient?.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">
                      {record.encounter?.visit_date ? new Date(record.encounter.visit_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B] max-w-[200px] truncate">
                      {record.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="text-[#1E40AF] hover:text-[#1D4ED8] text-sm font-medium"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <h2 className="text-subheading text-[#0F172A]">Odontogram Details</h2>
                <button onClick={() => setSelectedRecord(null)} className="text-[#9CA3AF] hover:text-[#111827]">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Patient</p>
                  <p className="text-sm font-medium text-[#111827]">
                    {selectedRecord.patient?.last_name}, {selectedRecord.patient?.first_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Date</p>
                  <p className="text-sm font-medium text-[#111827]">
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedRecord.notes && (
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Notes</p>
                  <p className="text-sm text-[#111827]">{selectedRecord.notes}</p>
                </div>
              )}
              {/* Display tooth data */}
              <div>
                <p className="text-xs text-[#9CA3AF] uppercase mb-2">Tooth Chart</p>
                <div className="grid grid-cols-8 gap-2">
                  {selectedRecord.tooth_data?.permanent?.map((tooth: any) => (
                    <div
                      key={tooth.number}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs ${getStatusColor(tooth.status)}`}
                      title={`Tooth ${tooth.number}: ${tooth.status}`}
                    >
                      {tooth.number}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
