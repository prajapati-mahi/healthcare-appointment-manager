import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { UserCheck, Plus, Search, Stethoscope, Ban, CheckCircle2 } from 'lucide-react';

export default function AdminDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/doctors?q=${query}`);
      setDoctors(res.data.data || []);
    } catch (err) {
      console.error('Failed to load doctors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Doctor Roster Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage physician credentials, active status, and onboard new practitioners.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/admin/doctors/new')}>
          <Plus className="w-4 h-4 mr-1.5" /> Onboard Doctor
        </Button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Input
          placeholder="Search by doctor name or specialization..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingPage message="Loading doctor roster..." />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No doctors found"
          description="No doctors match your query."
          actionText="Add Doctor"
          onAction={() => navigate('/admin/doctors/new')}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Qualifications</th>
                  <th className="py-3.5 px-4">Slot (Min)</th>
                  <th className="py-3.5 px-4">Fee (₹)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {doctors.map((doc) => {
                  const p = doc.doctorProfile;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{doc.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{doc.email}</div>
                      </td>
                      <td className="py-3 px-4 text-teal-600 font-medium">
                        {p?.specialization || 'General'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p?.qualifications || 'MBBS'}</td>
                      <td className="py-3 px-4 font-mono">{p?.slotDuration || 30}</td>
                      <td className="py-3 px-4 font-semibold">₹{p?.consultationFee || 500}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {doc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-600"
                          onClick={() => handleToggleStatus(doc.id)}
                        >
                          {doc.isActive ? (
                            <span className="text-rose-600">Deactivate</span>
                          ) : (
                            <span className="text-emerald-600">Activate</span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
