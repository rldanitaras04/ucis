'use client';

import { useState } from 'react';
import { recordFBS } from './actions';

export default function FBSPage() {
  const [patientId, setPatientId] = useState('');
  const [fbsValue, setFbsValue] = useState('');
  const [fastingHours, setFastingHours] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await recordFBS({
      patient_id: patientId,
      fbs_value: Number(fbsValue),
      fasting_hours: fastingHours ? Number(fastingHours) : undefined,
      notes: notes || undefined,
    });

    if (result.success) {
      setSuccess(true);
      setFbsValue('');
      setFastingHours('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to record FBS');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Record FBS</h1>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          FBS recorded successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FBS Value (mg/dL) *</label>
            <input
              type="number"
              step="0.1"
              value={fbsValue}
              onChange={(e) => setFbsValue(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fasting Hours</label>
            <input
              type="number"
              value={fastingHours}
              onChange={(e) => setFastingHours(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Recording...' : 'Record FBS'}
        </button>
      </form>
    </div>
  );
}
