import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Appointment } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      const res = await api.get(`/admin/appointments?${params.toString()}`);
      setAppointments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">All Consultation Bookings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Master registry of all patient appointments across all healthcare departments.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <Select
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'BOOKED', value: 'BOOKED' },
              { label: 'CONFIRMED', value: 'CONFIRMED' },
              { label: 'COMPLETED', value: 'COMPLETED' },
              { label: 'CANCELLED', value: 'CANCELLED' },
              { label: 'DOCTOR_LEAVE', value: 'DOCTOR_LEAVE' },
              { label: 'RESCHEDULED', value: 'RESCHEDULED' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingPage message="Retrieving appointments registry..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments match query"
          description="Try broadening your status or date filters."
        />
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Ref</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {appt.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {appt.patient?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{appt.doctor?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-teal-600">
                        {appt.doctor?.doctorProfile?.specialization}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        {appt.appointmentDate
                          ? format(new Date(appt.appointmentDate), 'MMM d, yyyy')
                          : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {appt.startTime} - {appt.endTime}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.calendarSyncStatus === 'SYNCED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : appt.calendarSyncStatus === 'FAILED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {appt.calendarSyncStatus || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
