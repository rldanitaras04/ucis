'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  user_type: string;
  status: string;
  campus_id?: string;
  created_at: string;
  user_roles?: { roles: { name: string } }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles(roles(name))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = !roleFilter || 
      user.user_roles?.some((ur) => ur.roles?.name === roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const getPrimaryRole = (user: UserProfile) => {
    return user.user_roles?.[0]?.roles?.name || 'user';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">User Management</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search users..."
          className="input-field max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field max-w-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="doctor">Doctor</option>
          <option value="dentist">Dentist</option>
          <option value="nurse">Nurse</option>
          <option value="clinic_staff">Clinic Staff</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">
                      {user.first_name} {user.last_name}
                    </td>
                    <td>{user.email || '-'}</td>
                    <td className="capitalize">{user.user_type.replace('_', ' ')}</td>
                    <td className="capitalize">{getPrimaryRole(user)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
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
