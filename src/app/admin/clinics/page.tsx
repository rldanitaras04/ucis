'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Clinic {
  id: string;
  name: string;
  description?: string;
  location?: string;
  contact_phone?: string;
  operating_hours?: string;
  is_active: boolean;
  campus_id: string;
  created_at: string;
  clinic_services?: { name: string; category: string }[];
}

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select(`
        *,
        clinic_services(name, category)
      `)
      .order('name');

    if (error) {
      toast.error('Failed to load clinics');
    } else {
      setClinics(data || []);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Clinic Management</h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : clinics.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No clinics found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic) => (
              <div key={clinic.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
                  <span className={`badge ${clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {clinic.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {clinic.description && (
                  <p className="text-sm text-gray-600 mb-2">{clinic.description}</p>
                )}
                {clinic.location && (
                  <p className="text-sm text-gray-500 mb-2">📍 {clinic.location}</p>
                )}
                {clinic.operating_hours && (
                  <p className="text-sm text-gray-500 mb-2">🕐 {clinic.operating_hours}</p>
                )}
                {clinic.clinic_services && clinic.clinic_services.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {clinic.clinic_services.map((service, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
