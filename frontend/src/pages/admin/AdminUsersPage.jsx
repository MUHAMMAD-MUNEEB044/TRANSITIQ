import React, { useEffect, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import api from '../../services/api.js';
import { toast } from '../../store/toastStore.js';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to load user accounts. You may need administrator privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('User role updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const term = (searchTerm || '').toLowerCase();
  const filteredUsers = users.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
            User Accounts & Role Permissions
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Manage system access for Passengers, Drivers, Operators, and System Administrators
          </p>
        </div>

        <div className="w-full sm:w-72">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-border-subtle focus-within:border-accent-purple transition-all text-xs font-mono">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user name or email..."
              className="bg-transparent text-white w-full focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {error && (
          <div className="mb-4 bg-status-red/10 border border-status-red/30 text-status-red text-xs font-mono px-4 py-3 rounded-xl flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={loadUsers} className="underline shrink-0">Retry</button>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs font-mono">
            No user accounts match this search.
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border-subtle/60 text-text-muted uppercase text-[10px]">
                <th className="pb-3 font-semibold">User Name</th>
                <th className="pb-3 font-semibold">Email Address</th>
                <th className="pb-3 font-semibold">Current Role</th>
                <th className="pb-3 font-semibold">Registered</th>
                <th className="pb-3 font-semibold text-right">Assign New Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30">
              {filteredUsers.map((u) => {
                let roleColor = 'text-text-primary bg-surface-alt';
                if (u.role === 'admin') roleColor = 'text-status-red bg-status-red/15 border border-status-red/30';
                if (u.role === 'operator') roleColor = 'text-accent-purple bg-accent-purple/15 border border-accent-purple/30';
                if (u.role === 'driver') roleColor = 'text-accent-blue bg-accent-blue/15 border border-accent-blue/30';
                if (u.role === 'passenger') roleColor = 'text-status-green bg-status-green/15 border border-status-green/30';

                return (
                  <tr key={u._id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent-purple" />
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 text-text-muted">{u.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${roleColor}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted">
                      {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-surface-alt text-white px-2.5 py-1 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-accent-purple"
                      >
                        <option value="passenger">Passenger</option>
                        <option value="driver">Driver</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
