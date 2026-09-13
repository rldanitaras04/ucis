'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { recordVitalSigns, fetchVitalSigns } from './actions';
import { fetchPatientName } from '../actions/patients';
import PatientSearch from '@/components/PatientSearch';
import VitalsAnalysis from '@/components/VitalsAnalysis';

interface VitalRecord {
  id: string;
  patient_id: string;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse_rate: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  patient?: { user_profile?: { first_name: string; last_name: string; employee_student_id?: string } };
}

function VitalsPageContent() {
  const searchParams = useSearchParams();
  const patientIdFromQueue = searchParams.get('patient') || '';
  const encounterIdFromQueue = searchParams.get('encounter') || '';
  const fromQueue = !!patientIdFromQueue && !!encounterIdFromQueue;

  const [patientId, setPatientId] = useState(patientIdFromQueue);
  const [encounterId, setEncounterId] = useState(encounterIdFromQueue);
  const [patientName, setPatientName] = useState('');
  const [patientNameLoading, setPatientNameLoading] = useState(false);
  const [formData, setFormData] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse_rate: '',
    respiratory_rate: '',
    temperature: '',
    oxygen_saturation: '',
    height: '',
    weight: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recentRecords, setRecentRecords] = useState<VitalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchRecentRecords = useCallback(async () => {
    setRecordsLoading(true);
    const result = await fetchVitalSigns();
    if (result.success) {
      setRecentRecords(result.data);
    }
    setRecordsLoading(false);
  }, []);

  useEffect(() => {
    fetchRecentRecords();
  }, [fetchRecentRecords]);

  useEffect(() => {
    if (fromQueue && patientIdFromQueue) {
      setPatientNameLoading(true);
      fetchPatientName(patientIdFromQueue).then((result) => {
        if (result.success) {
          setPatientName(`${result.data.last_name}, ${result.data.first_name}`);
        }
        setPatientNameLoading(false);
      });
    }
  }, [fromQueue, patientIdFromQueue]);

  const carinaTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (carinaTimerRef.current) clearTimeout(carinaTimerRef.current);

    const filledCount = [
      formData.blood_pressure_systolic,
      formData.blood_pressure_diastolic,
      formData.pulse_rate,
      formData.respiratory_rate,
      formData.temperature,
      formData.oxygen_saturation,
      formData.height,
      formData.weight,
    ].filter(Boolean).length;

    if (filledCount >= 2) {
      carinaTimerRef.current = setTimeout(() => {
        window.dispatchEvent(new Event('carina:open'));
        window.dispatchEvent(new CustomEvent('carina:analyze-vitals', {
          detail: {
            vitals: {
              blood_pressure_systolic: formData.blood_pressure_systolic || null,
              blood_pressure_diastolic: formData.blood_pressure_diastolic || null,
              pulse_rate: formData.pulse_rate || null,
              respiratory_rate: formData.respiratory_rate || null,
              temperature: formData.temperature || null,
              oxygen_saturation: formData.oxygen_saturation || null,
              height: formData.height || null,
              weight: formData.weight || null,
            },
          },
        }));
      }, 500);
    }

    return () => { if (carinaTimerRef.current) clearTimeout(carinaTimerRef.current); };
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await recordVitalSigns({
      patient_id: patientId,
      encounter_id: encounterId || undefined,
      blood_pressure_systolic: formData.blood_pressure_systolic ? Number(formData.blood_pressure_systolic) : undefined,
      blood_pressure_diastolic: formData.blood_pressure_diastolic ? Number(formData.blood_pressure_diastolic) : undefined,
      pulse_rate: formData.pulse_rate ? Number(formData.pulse_rate) : undefined,
      respiratory_rate: formData.respiratory_rate ? Number(formData.respiratory_rate) : undefined,
      temperature: formData.temperature ? Number(formData.temperature) : undefined,
      oxygen_saturation: formData.oxygen_saturation ? Number(formData.oxygen_saturation) : undefined,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setSuccess(true);

      window.dispatchEvent(new CustomEvent('carina:analyze-vitals', {
        detail: {
          patient_id: patientId,
          encounter_id: encounterId,
          vitals: {
            blood_pressure_systolic: formData.blood_pressure_systolic || null,
            blood_pressure_diastolic: formData.blood_pressure_diastolic || null,
            pulse_rate: formData.pulse_rate || null,
            respiratory_rate: formData.respiratory_rate || null,
            temperature: formData.temperature || null,
            oxygen_saturation: formData.oxygen_saturation || null,
            height: formData.height || null,
            weight: formData.weight || null,
          },
        },
      }));

      window.dispatchEvent(new Event('carina:open'));

      setFormData({
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse_rate: '',
        respiratory_rate: '',
        temperature: '',
        oxygen_saturation: '',
        height: '',
        weight: '',
        notes: '',
      });
      setTimeout(() => setSuccess(false), 3000);
      fetchRecentRecords();
    } else {
      setError(result.error || 'Failed to record vital signs');
    }
    setLoading(false);
  };

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-heading text-[#0F172A] mb-6">Record Vital Signs</h1>

      {success && (
        <div className="alert-success mb-4" role="status">
          Vital signs recorded successfully!
        </div>
      )}

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        {fromQueue ? (
          <div>
            <label className="label">Patient *</label>
            <div className="input-field bg-[#F8FAFC]">
              {patientNameLoading ? (
                <span className="text-[#94A3B8]">Loading...</span>
              ) : (
                <span className="font-medium text-[#0F172A]">{patientName || patientId}</span>
              )}
              <input type="hidden" value={patientId} />
            </div>
          </div>
        ) : (
          <PatientSearch
            id="vitals-patient-search"
            label="Patient"
            required
            value={patientId}
            onChange={(pid, patient) => {
              setPatientId(pid);
              if (patient) setPatientName(`${patient.last_name}, ${patient.first_name}`);
            }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="systolic" className="label">Systolic BP</label>
            <input
              id="systolic"
              type="number"
              value={formData.blood_pressure_systolic}
              onChange={(e) => setFormData({ ...formData, blood_pressure_systolic: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="diastolic" className="label">Diastolic BP</label>
            <input
              id="diastolic"
              type="number"
              value={formData.blood_pressure_diastolic}
              onChange={(e) => setFormData({ ...formData, blood_pressure_diastolic: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pulse" className="label">Pulse Rate</label>
            <input
              id="pulse"
              type="number"
              value={formData.pulse_rate}
              onChange={(e) => setFormData({ ...formData, pulse_rate: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="respiratory" className="label">Respiratory Rate</label>
            <input
              id="respiratory"
              type="number"
              value={formData.respiratory_rate}
              onChange={(e) => setFormData({ ...formData, respiratory_rate: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="temperature" className="label">Temperature</label>
            <input
              id="temperature"
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="o2sat" className="label">O2 Saturation</label>
            <input
              id="o2sat"
              type="number"
              value={formData.oxygen_saturation}
              onChange={(e) => setFormData({ ...formData, oxygen_saturation: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="height" className="label">Height (cm)</label>
            <input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="weight" className="label">Weight (kg)</label>
            <input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="input-field tabular-nums"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Recording...' : 'Record Vital Signs'}
        </button>
      </form>

      <VitalsAnalysis vitals={formData} />

      <div className="card mt-8">
        <h2 className="text-subheading text-[#0F172A] mb-4">Recent Vital Signs</h2>

        {recordsLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-[#64748B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-body text-[#64748B] ml-3">Loading records...</span>
          </div>
        ) : recentRecords.length === 0 ? (
          <p className="text-body text-[#94A3B8] py-8 text-center">No vital signs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-small font-medium text-[#64748B] text-left">Patient</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Date</th>
                  <th className="text-small font-medium text-[#64748B] text-left">BP</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Pulse</th>
                  <th className="text-small font-medium text-[#64748B] text-left">Temp</th>
                  <th className="text-small font-medium text-[#64748B] text-left">O2 Sat</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="text-body text-[#0F172A]">
                      {record.patient?.user_profile?.last_name}, {record.patient?.user_profile?.first_name}
                      <br />
                      <span className="text-small text-[#94A3B8]">{record.patient?.user_profile?.employee_student_id || '—'}</span>
                    </td>
                    <td className="text-body text-[#334155]">
                      {new Date(record.recorded_at).toLocaleDateString()}
                    </td>
                    <td className="text-body text-[#0F172A] tabular-nums">
                      {record.blood_pressure_systolic != null && record.blood_pressure_diastolic != null
                        ? `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}`
                        : <span className="badge-neutral">N/A</span>}
                    </td>
                    <td className="text-body text-[#0F172A] tabular-nums">
                      {record.pulse_rate != null
                        ? record.pulse_rate
                        : <span className="badge-neutral">N/A</span>}
                    </td>
                    <td className="text-body text-[#0F172A] tabular-nums">
                      {record.temperature != null
                        ? `${record.temperature}°`
                        : <span className="badge-neutral">N/A</span>}
                    </td>
                    <td className="text-body text-[#0F172A] tabular-nums">
                      {record.oxygen_saturation != null
                        ? `${record.oxygen_saturation}%`
                        : <span className="badge-neutral">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VitalsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <VitalsPageContent />
    </Suspense>
  );
}
