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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-blue-600">UCIS Setup</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create the initial superadmin account
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Superadmin</h2>
          <p className="text-sm text-gray-600 mb-4">
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
            <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <div>
                  <p className="text-green-800 font-medium">Account created successfully!</p>
                  <p className="text-sm text-green-700 mt-2">
                    <strong>Email:</strong> {result.email}<br />
                    <strong>Password:</strong> {result.password}<br />
                    <strong>User ID:</strong> {result.userId}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    You can now <a href="/auth/login" className="underline">sign in</a>.
                  </p>
                </div>
              ) : (
                <p className="text-red-800">{result.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>This page should be deleted after initial setup.</p>
        </div>
      </div>
    </div>
  );
}
