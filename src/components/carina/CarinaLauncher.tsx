'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import CarinaPanel from './CarinaPanel';

export default function CarinaLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name')
          .eq('auth_user_id', user.id)
          .single();

        if (profile) {
          setUserName(profile.first_name);
        }

        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const userRoles = rolesData?.map((r: any) => r.roles?.name).filter(Boolean) || [];
        setRoles(userRoles);
      }
    };

    getUser();
  }, [supabase]);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('carina:toggle', handleToggle);
    return () => window.removeEventListener('carina:toggle', handleToggle);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 overflow-hidden border-2 border-white group focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
        aria-label={isOpen ? 'Close Carina assistant' : 'Open Carina assistant'}
        aria-expanded={isOpen}
        aria-controls="carina-panel"
        title="Carina AI Assistant"
      >
        <img
          src="/carina.png"
          alt="Carina"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform motion-safe:group-hover:scale-110"
        />
      </button>

      <CarinaPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        roles={roles}
        userName={userName}
      />
    </>
  );
}
