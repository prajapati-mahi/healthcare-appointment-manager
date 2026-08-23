import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Appointment } from '../../types';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get(`/appointments/doctor/my?${params.toString()}`);
      setAppointments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Doctor Patient Consultations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review patient appointments, pre-visit AI insights, and complete post-visit records.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingPage message="Loading doctor appointment records..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No consultations found"
          description="No appointments match your current filters."
          actionText={dateFilter || statusFilter !== 'ALL' ? 'Clear Filters' : undefined}
          onAction={() => {
            setDateFilter('');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              role="DOCTOR"
              onView={(id) => navigate(`/doctor/appointments/${id}`)}
              onComplete={(id) => navigate(`/doctor/appointments/${id}/post-visit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
