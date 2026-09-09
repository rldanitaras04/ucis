'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateUserRole, updateUserStatus } from './actions';

interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role_id: string;
  is_active: string;
  roles: { name: string };
}

interface Role {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRole, setEditingRole] = useState<UserProfile | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('last_name', { ascending: true });

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*, roles(name)')
      .eq('is_active', true);

    const { data: allRoles } = await supabase
      .from('roles')
      .select('id, name')
      .order('name');

    if (usersError || rolesError) {
      setError('Failed to fetch user data');
      return;
    }

    setUsers(usersData || []);
    setUserRoles(rolesData || []);
    setRoles(allRoles || []);
  };

  useEffect(() => {
    fetchData();
    setLoading(false);
  }, []);

  const getUserRoles = (authUserId: string) => {
    return userRoles
      .filter(ur => ur.user_id === authUserId)
      .map(ur => ur.roles?.name)
      .filter(Boolean);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'inactive': return 'badge-neutral';
      case 'suspended': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const handleUpdateRole = async () => {
    if (!editingRole || !selectedRoleId) return;
    setActionLoading('role');
    const result = await updateUserRole(editingRole.auth_user_id, selectedRoleId);
    if (result.success) {
      setSuccess('Role updated successfully');
      setEditingRole(null);
      fetchData();
    } else {
      setError(result.error);
    }
    setActionLoading(null);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(user.id);
    const result = await updateUserStatus(user.id, newStatus);
    if (result.success) {
      setSuccess(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
      setConfirmSuspend(null);
      fetchData();
    } else {
      setError(result.error);
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading users">
        <div className="spinner"></div>
        <span className="sr-only">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-heading text-[#0F172A] mb-6">User Management</h1>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="status">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 text-[#94A3B8] hover:text-[#0F172A]">&times;</button>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <label htmlFor="search-users" className="label">Search Users</label>
          <input
            id="search-users"
            type="text"
            placeholder="Filter by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#F8FAFC]">
                  <td className="font-medium">
                    {user.last_name}, {user.first_name}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user.auth_user_id).map((role, idx) => (
                        <span key={idx} className="badge badge-info">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingRole(user);
                          setSelectedRoleId(userRoles.find(ur => ur.user_id === user.auth_user_id)?.role_id || '');
                        }}
                        className="btn-secondary text-xs"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => setConfirmSuspend(user)}
                        className={user.status === 'suspended' ? 'btn-primary text-xs' : 'btn-danger text-xs'}
                      >
                        {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No users found
          </div>
        )}
      </div>

      {editingRole && (
        <div className="dialog-overlay" onClick={() => setEditingRole(null)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-subheading text-[#0F172A] mb-2">Edit User Role</h3>
            <p className="text-body text-[#64748B] mb-4">
              Changing role for {editingRole.first_name} {editingRole.last_name}
            </p>
            <div className="mb-4">
              <label htmlFor="role-select" className="label">Select Role</label>
              <select
                id="role-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="select-field w-full"
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingRole(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleUpdateRole}
                disabled={!selectedRoleId || actionLoading === 'role'}
                className="btn-primary"
              >
                {actionLoading === 'role' ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSuspend && (
        <div className="dialog-overlay" onClick={() => setConfirmSuspend(null)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-subheading text-[#0F172A] mb-2">
              {confirmSuspend.status === 'suspended' ? 'Activate User?' : 'Suspend User?'}
            </h3>
            <p className="text-body text-[#64748B] mb-4">
              {confirmSuspend.status === 'suspended'
                ? `This will restore access for ${confirmSuspend.first_name} ${confirmSuspend.last_name}.`
                : `This will suspend ${confirmSuspend.first_name} ${confirmSuspend.last_name}'s access. They will not be able to log in.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmSuspend(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => handleToggleStatus(confirmSuspend)}
                disabled={actionLoading === confirmSuspend.id}
                className={confirmSuspend.status === 'suspended' ? 'btn-primary' : 'btn-danger'}
              >
                {actionLoading === confirmSuspend.id
                  ? 'Processing...'
                  : confirmSuspend.status === 'suspended'
                    ? 'Activate'
                    : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
