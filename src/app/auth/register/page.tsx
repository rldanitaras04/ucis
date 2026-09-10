'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
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
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: formData.userType,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            auth_user_id: authData.user.id,
            user_type: formData.userType,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            university_id: formData.universityId || null,
            status: 'active',
          });

        if (profileError) throw profileError;

        let roleName = formData.userType;
        if (formData.userType === 'walk_in') {
          roleName = 'student';
        }

        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('name', roleName)
          .single();

        if (role) {
          await supabase.from('user_roles').insert({
            user_id: authData.user.id,
            role_id: role.id,
            is_active: true,
          });
        }
      }

      toast.success('Registration successful! Please check your email to verify your account.');
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
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="non_teaching_staff">Non-Teaching Staff</option>
                <option value="walk_in">Walk-in Patient</option>
              </select>
            </div>
            {(formData.userType === 'student' || formData.userType === 'faculty' || formData.userType === 'non_teaching_staff') && (
              <div>
                <label htmlFor="universityId" className="label">University/Employee ID</label>
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
