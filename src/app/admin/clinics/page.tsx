'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Clinic {
  id: string;
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  operating_hours?: string;
  is_active: boolean;
}

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchClinics = async () => {
    const { data, error: fetchError } = await supabase
      .from('clinics')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError('Failed to fetch clinics');
      return;
    }

    setClinics(data || []);
  };

  useEffect(() => {
    fetchClinics();
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Clinic Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{clinic.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {clinic.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {clinic.description && (
              <p className="text-gray-600 text-sm mb-2">{clinic.description}</p>
            )}
            {clinic.location && (
              <p className="text-gray-500 text-sm mb-1">📍 {clinic.location}</p>
            )}
            {clinic.capacity && (
              <p className="text-gray-500 text-sm mb-1">👥 Capacity: {clinic.capacity}</p>
            )}
            {clinic.operating_hours && (
              <p className="text-gray-500 text-sm">🕐 {clinic.operating_hours}</p>
            )}
          </div>
        ))}
      </div>

      {clinics.length === 0 && (
        <div className="text-center py-8 text-gray-500">No clinics configured</div>
      )}
    </div>
  );
}
