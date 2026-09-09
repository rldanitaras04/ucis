'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const createSuperAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/setup', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setResult(data);
      toast.success('Superadmin created successfully!');
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#1E40AF] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <h1 className="text-display text-[#0F172A]">UCIS Setup</h1>
          <p className="mt-2 text-body text-[#64748B]">
            Create the initial superadmin account
          </p>
        </div>

        <div className="card">
          <h2 className="text-subheading text-[#0F172A] mb-4">Create Superadmin</h2>
          <p className="text-body text-[#64748B] mb-4">
            This will create the initial administrator account with full system access.
          </p>

          <button
            onClick={createSuperAdmin}
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? 'Creating...' : 'Create Superadmin Account'}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-[#ECFDF5] border border-[#6EE7B7]' : 'bg-[#FEF2F2] border border-[#FCA5A5]'}`}>
              {result.success ? (
                <div>
                  <p className="text-[#059669] font-medium">Account created successfully!</p>
                  <p className="text-sm text-[#059669] mt-2">
                    <strong>Email:</strong> {result.email}<br />
                    <strong>Password:</strong> {result.password}<br />
                    <strong>User ID:</strong> {result.userId}
                  </p>
                  <p className="text-sm text-[#059669] mt-2">
                    You can now <a href="/auth/login" className="underline font-medium">sign in</a>.
                  </p>
                </div>
              ) : (
                <p className="text-[#DC2626]">{result.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-small text-[#94A3B8]">
          <p>This page should be deleted after initial setup.</p>
        </div>
      </div>
    </div>
  );
}
