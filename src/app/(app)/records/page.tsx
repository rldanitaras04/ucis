'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPatients } from './actions';
import { registerPatient } from '@/app/(app)/patient/actions';
import { fetchSystemConfig } from '@/app/(app)/admin/library/actions';
import Link from 'next/link';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  contact_number?: string;
  date_of_birth?: string;
  gender: string;
  blood_type?: string;
  user_type: string;
  status: string;
  created_at: string;
  employee_student_id?: string;
  college?: string;
  course?: string;
  year_level?: string;
  department?: string;
  position?: string;
}

interface ConfigOption {
  config_value: string;
  label: string;
}

const emptyForm = {
  first_name: '', middle_name: '', last_name: '', suffix: '',
  email: '', contact_number: '', date_of_birth: '', gender: '',
  blood_type: '', allergies: '', emergency_contact_name: '',
  emergency_contact_phone: '', employee_student_id: '', college: '',
  course: '', year_level: '', department: '', position: '',
  user_type: 'student', address: '',
};

export default function RecordsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regData, setRegData] = useState(emptyForm);

  const [patientTypes, setPatientTypes] = useState<ConfigOption[]>([]);
  const [colleges, setColleges] = useState<ConfigOption[]>([]);
  const [courses, setCourses] = useState<ConfigOption[]>([]);
  const [yearLevels, setYearLevels] = useState<ConfigOption[]>([]);
  const [departments, setDepartments] = useState<ConfigOption[]>([]);

  const loadPatients = useCallback(async (query: string, isSearch = false) => {
    if (isSearch) setSearching(true);
    else setLoading(true);
    const result = await fetchPatients(query);
    if (result.success) {
      setPatients(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => loadPatients(searchQuery, true), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery, loadPatients]);

  const loadConfig = useCallback(async () => {
    const [pt, co, cs, yl, dp] = await Promise.all([
      fetchSystemConfig('user_type'),
      fetchSystemConfig('college'),
      fetchSystemConfig('course'),
      fetchSystemConfig('year_level'),
      fetchSystemConfig('department'),
    ]);
    if (pt.success) setPatientTypes(pt.data);
    if (co.success) setColleges(co.data);
    if (cs.success) setCourses(cs.data);
    if (yl.success) setYearLevels(yl.data);
    if (dp.success) setDepartments(dp.data);
  }, []);

  const openRegister = async () => {
    setRegData(emptyForm);
    setRegError(null);
    setRegSuccess(false);
    setShowRegister(true);
    await loadConfig();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    const result = await registerPatient({
      first_name: regData.first_name,
      middle_name: regData.middle_name || undefined,
      last_name: regData.last_name,
      suffix: regData.suffix || undefined,
      email: regData.email || undefined,
      contact_number: regData.contact_number || undefined,
      date_of_birth: regData.date_of_birth,
      gender: regData.gender,
      blood_type: regData.blood_type || undefined,
      allergies: regData.allergies || undefined,
      emergency_contact_name: regData.emergency_contact_name || undefined,
      emergency_contact_phone: regData.emergency_contact_phone || undefined,
      employee_student_id: regData.employee_student_id || undefined,
      college: regData.college || undefined,
      course: regData.course || undefined,
      year_level: regData.year_level || undefined,
      department: regData.department || undefined,
      position: regData.position || undefined,
      user_type: regData.user_type,
      address: regData.address || undefined,
    });

    if (result.success) {
      setRegSuccess(true);
      await loadPatients(searchQuery);
    } else {
      setRegError(result.error || 'Registration failed');
    }
    setRegLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading records">
        <div className="spinner"></div>
        <span className="sr-only">Loading records...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">Patient Records</h1>
        <button onClick={openRegister} className="btn-primary">Register Patient</button>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]" aria-label="Close">&times;</button>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="search" className="sr-only">Search patients</label>
        <div className="relative max-w-md">
          <input
            id="search"
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-8"
          />
          {searching && (
            <svg className="animate-spin h-4 w-4 text-[#94A3B8] absolute right-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Gender</th>
                <th scope="col">Type</th>
                <th scope="col">Details</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {patients.map((patient) => {
                const isStudent = patient.user_type === 'student';
                return (
                <tr key={patient.id} className="hover:bg-[#F8FAFC]">
                  <td>
                    <span className="font-medium text-[#0F172A]">{patient.last_name}, {patient.first_name}</span>
                    <br />
                    <span className="text-small text-[#94A3B8]">{patient.employee_student_id || '—'}</span>
                  </td>
                  <td>{patient.gender}</td>
                  <td>{patient.user_type}</td>
                  <td className="text-small text-[#64748B]">
                    {isStudent ? (
                      <>{patient.course || '—'} {patient.year_level || ''}</>
                    ) : (
                      <>{patient.department || '—'} {patient.position || ''}</>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      patient.status === 'active' ? 'badge-success' : 'badge-neutral'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/records/${patient.id}`} className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium text-sm">View</Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {patients.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No patients found
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegister && (
        <div className="dialog-overlay" onClick={() => setShowRegister(false)}>
          <div className="dialog-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="register-dialog-title">
            {regSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl text-[#059669]">✓</span>
                </div>
                <h2 id="register-dialog-title" className="text-subheading text-[#0F172A]">Registration Complete</h2>
                <p className="text-body text-[#64748B]">
                  Patient <strong>{regData.last_name}, {regData.first_name}</strong> has been registered.
                </p>
                <button onClick={() => { setRegSuccess(false); setRegData(emptyForm); }} className="btn-primary">
                  Register Another
                </button>
                <button onClick={() => setShowRegister(false)} className="btn-secondary ml-2">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div className="flex items-center justify-between mb-6">
                  <h2 id="register-dialog-title" className="text-subheading text-[#0F172A]">Register New Patient</h2>
                  <button type="button" onClick={() => setShowRegister(false)} className="text-[#94A3B8] hover:text-[#0F172A] text-xl font-bold" aria-label="Close">&times;</button>
                </div>

                {regError && (
                  <div className="alert-error mb-4" role="alert">
                    {regError}
                    <button onClick={() => setRegError(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]" aria-label="Close">&times;</button>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-first_name" className="label">First Name *</label>
                      <input id="reg-first_name" type="text" required value={regData.first_name} onChange={(e) => setRegData({ ...regData, first_name: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="reg-last_name" className="label">Last Name *</label>
                      <input id="reg-last_name" type="text" required value={regData.last_name} onChange={(e) => setRegData({ ...regData, last_name: e.target.value })} className="input-field" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-middle_name" className="label">Middle Name</label>
                      <input id="reg-middle_name" type="text" value={regData.middle_name} onChange={(e) => setRegData({ ...regData, middle_name: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="reg-suffix" className="label">Suffix</label>
                      <input id="reg-suffix" type="text" value={regData.suffix} onChange={(e) => setRegData({ ...regData, suffix: e.target.value })} className="input-field" placeholder="Jr., Sr., III, etc." />
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="reg-gender" className="label">Gender *</label>
                      <select id="reg-gender" required value={regData.gender} onChange={(e) => setRegData({ ...regData, gender: e.target.value })} className="select-field">
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-dob" className="label">Date of Birth *</label>
                      <input id="reg-dob" type="date" required value={regData.date_of_birth} onChange={(e) => setRegData({ ...regData, date_of_birth: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="reg-blood_type" className="label">Blood Type</label>
                      <select id="reg-blood_type" value={regData.blood_type} onChange={(e) => setRegData({ ...regData, blood_type: e.target.value })} className="select-field">
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-email" className="label">Email</label>
                      <input id="reg-email" type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="reg-contact" className="label">Contact Number</label>
                      <input id="reg-contact" type="tel" value={regData.contact_number} onChange={(e) => setRegData({ ...regData, contact_number: e.target.value })} className="input-field" />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="reg-address" className="label">Address</label>
                    <textarea id="reg-address" rows={2} value={regData.address} onChange={(e) => setRegData({ ...regData, address: e.target.value })} className="input-field" />
                  </div>

                  {/* Type & ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-user_type" className="label">Patient Type *</label>
                      <select id="reg-user_type" required value={regData.user_type} onChange={(e) => setRegData({ ...regData, user_type: e.target.value })} className="select-field">
                        {patientTypes.map(pt => <option key={pt.config_value} value={pt.config_value}>{pt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-employee_student_id" className="label">
                        {regData.user_type === 'student' ? 'Student ID' : 'Employee ID'}
                      </label>
                      <input id="reg-employee_student_id" type="text" value={regData.employee_student_id} onChange={(e) => setRegData({ ...regData, employee_student_id: e.target.value })} className="input-field" />
                    </div>
                  </div>

                  {/* Student-specific */}
                  {regData.user_type === 'student' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="reg-college" className="label">College</label>
                        <select id="reg-college" value={regData.college} onChange={(e) => setRegData({ ...regData, college: e.target.value })} className="select-field">
                          <option value="">Select</option>
                          {colleges.map(c => <option key={c.config_value} value={c.config_value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reg-course" className="label">Course</label>
                        <select id="reg-course" value={regData.course} onChange={(e) => setRegData({ ...regData, course: e.target.value })} className="select-field">
                          <option value="">Select</option>
                          {courses.map(c => <option key={c.config_value} value={c.config_value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reg-year_level" className="label">Year</label>
                        <select id="reg-year_level" value={regData.year_level} onChange={(e) => setRegData({ ...regData, year_level: e.target.value })} className="select-field">
                          <option value="">Select</option>
                          {yearLevels.map(y => <option key={y.config_value} value={y.config_value}>{y.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Faculty / Non-teaching staff */}
                  {(regData.user_type === 'faculty' || regData.user_type === 'non_teaching_staff') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reg-department" className="label">Department</label>
                        <select id="reg-department" value={regData.department} onChange={(e) => setRegData({ ...regData, department: e.target.value })} className="select-field">
                          <option value="">Select</option>
                          {departments.map(d => <option key={d.config_value} value={d.config_value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reg-position" className="label">Position</label>
                        <input id="reg-position" type="text" value={regData.position} onChange={(e) => setRegData({ ...regData, position: e.target.value })} className="input-field" />
                      </div>
                    </div>
                  )}

                  {/* Emergency & Allergies */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-emergency_name" className="label">Emergency Contact Name</label>
                      <input id="reg-emergency_name" type="text" value={regData.emergency_contact_name} onChange={(e) => setRegData({ ...regData, emergency_contact_name: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="reg-emergency_phone" className="label">Emergency Contact Phone</label>
                      <input id="reg-emergency_phone" type="tel" value={regData.emergency_contact_phone} onChange={(e) => setRegData({ ...regData, emergency_contact_phone: e.target.value })} className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reg-allergies" className="label">Allergies</label>
                    <textarea id="reg-allergies" rows={2} value={regData.allergies} onChange={(e) => setRegData({ ...regData, allergies: e.target.value })} className="input-field" placeholder="List any known allergies" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={regLoading} className="btn-primary">
                      {regLoading ? 'Registering...' : 'Register Patient'}
                    </button>
                    <button type="button" onClick={() => setShowRegister(false)} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
