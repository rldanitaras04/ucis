'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchPatients, PatientSearchResult } from '@/app/(app)/actions/patients';

interface PatientSearchProps {
  value: string;
  onChange: (patientId: string, patient?: PatientSearchResult) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  id?: string;
}

export default function PatientSearch({
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Search by name or ID...',
  label = 'Patient',
  id = 'patient-search',
}: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const result = await searchPatients(searchQuery);
    if (result.success) {
      setResults(result.data);
      setIsOpen(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query, doSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && !selectedPatient) {
      searchPatients(value).then((result) => {
        if (result.success) {
          const match = result.data.find((p) => p.id === value);
          if (match) setSelectedPatient(match);
        }
      });
    }
  }, [value, selectedPatient]);

  const handleSelect = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange(patient.id, patient);
  };

  const handleClear = () => {
    setSelectedPatient(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="label">{label} {required && '*'}</label>

      {selectedPatient ? (
        <div className="input-field flex items-center justify-between">
          <span className="font-medium text-[#0F172A]">
            {selectedPatient.last_name}, {selectedPatient.first_name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-[#64748B] hover:text-[#DC2626] ml-2 font-bold text-lg leading-none"
            aria-label="Clear patient selection"
          >
            &times;
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1); }}
            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required && !value}
            className="input-field pr-8"
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm">Searching...</span>
          )}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-lg shadow-lg max-h-60 overflow-auto" role="listbox">
          {results.map((patient, index) => (
            <li
              key={patient.id}
              onClick={() => handleSelect(patient)}
              className={`px-4 py-3 cursor-pointer border-b border-[#F1F5F9] last:border-0 ${
                index === highlightIndex ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
              }`}
              role="option"
              aria-selected={index === highlightIndex}
            >
              <div className="font-medium text-[#0F172A]">
                {patient.last_name}, {patient.first_name}
              </div>
              <div className="text-small text-[#64748B] flex gap-3 mt-0.5">
                {patient.employee_student_id && <span className="font-medium text-[#334155]">{patient.employee_student_id}</span>}
                {patient.gender && <span>{patient.gender}</span>}
                {patient.date_of_birth && <span>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</span>}
                {patient.blood_type && <span>{patient.blood_type}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.trim().length > 0 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-lg shadow-lg px-4 py-3 text-[#64748B]">
          No patients found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
