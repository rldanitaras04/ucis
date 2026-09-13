'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchSystemConfig } from '@/app/(app)/admin/library/actions';
import { registerUser } from './actions';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student',
    universityId: '',
    college: '',
    course: '',
    yearLevel: '',
    department: '',
    position: '',
  });
  const [loading, setLoading] = useState(false);
  const [userTypes, setUserTypes] = useState<{ config_value: string; label: string }[]>([]);
  const [colleges, setColleges] = useState<{ config_value: string; label: string }[]>([]);
  const [courses, setCourses] = useState<{ config_value: string; label: string }[]>([]);
  const [yearLevels, setYearLevels] = useState<{ config_value: string; label: string }[]>([]);
  const [departments, setDepartments] = useState<{ config_value: string; label: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchSystemConfig('user_type').then(r => {
      if (r.success) setUserTypes(r.data);
    });
    fetchSystemConfig('college').then(r => {
      if (r.success) setColleges(r.data);
    });
    fetchSystemConfig('course').then(r => {
      if (r.success) setCourses(r.data);
    });
    fetchSystemConfig('year_level').then(r => {
      if (r.success) setYearLevels(r.data);
    });
    fetchSystemConfig('department').then(r => {
      if (r.success) setDepartments(r.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userType: formData.userType,
        employeeStudentId: formData.universityId || undefined,
        college: formData.college || undefined,
        course: formData.course || undefined,
        yearLevel: formData.yearLevel || undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Account created successfully!');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/clinic_logo.png"
            alt="UCIS Logo"
            width={64}
            height={64}
            className="rounded-2xl mx-auto mb-4"
            priority
          />
          <h1 className="text-display text-[#0F172A]">UCIS</h1>
          <h2 className="text-heading text-[#0F172A] mt-2">
            Create an account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="input-field"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="input-field"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="userType" className="label">I am a...</label>
              <select
                id="userType"
                name="userType"
                className="select-field"
                value={formData.userType}
                onChange={handleChange}
              >
                {userTypes.map(ut => <option key={ut.config_value} value={ut.config_value}>{ut.label}</option>)}
              </select>
            </div>
            {(formData.userType === 'student' || formData.userType === 'faculty' || formData.userType === 'non_teaching_staff') && (
              <div>
                <label htmlFor="universityId" className="label">
                  {formData.userType === 'student' ? 'Student ID' : 'Employee ID'}
                </label>
                <input
                  id="universityId"
                  name="universityId"
                  type="text"
                  className="input-field"
                  value={formData.universityId}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            )}
            {formData.userType === 'student' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="college" className="label">College</label>
                  <select id="college" name="college" className="select-field" value={formData.college} onChange={handleChange}>
                    <option value="">Select</option>
                    {colleges.map(c => <option key={c.config_value} value={c.config_value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="course" className="label">Course</label>
                  <select id="course" name="course" className="select-field" value={formData.course} onChange={handleChange}>
                    <option value="">Select</option>
                    {courses.map(c => <option key={c.config_value} value={c.config_value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="yearLevel" className="label">Year</label>
                  <select id="yearLevel" name="yearLevel" className="select-field" value={formData.yearLevel} onChange={handleChange}>
                    <option value="">Select</option>
                    {yearLevels.map(y => <option key={y.config_value} value={y.config_value}>{y.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            {(formData.userType === 'faculty' || formData.userType === 'non_teaching_staff') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="label">Department</label>
                  <select id="department" name="department" className="select-field" value={formData.department} onChange={handleChange}>
                    <option value="">Select</option>
                    {departments.map(d => <option key={d.config_value} value={d.config_value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="position" className="label">Position</label>
                  <input id="position" name="position" type="text" className="input-field" value={formData.position} onChange={handleChange} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={handleChange}
                minLength={12}
              />
              <p className="mt-1 text-small text-[#94A3B8]">At least 12 characters</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-field"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-body text-[#64748B]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#1E40AF] hover:text-[#1D4ED8] font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
