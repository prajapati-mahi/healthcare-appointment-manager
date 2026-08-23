import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingPage } from '../../components/common/LoadingPage';
import { CalendarOff, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminLeaveManagement() {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New leave form
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/doctors');
        const docs = res.data.data || [];
        setDoctors(docs);
        if (docs.length > 0) setSelectedDoctorId(docs[0].id);
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const fetchLeaves = async (docId: string) => {
    if (!docId) return;
    try {
      const doc = doctors.find((d) => d.id === docId);
      setLeaves((doc?.doctorProfile as any)?.leaves || []);
    } catch (err) {
      console.error('Failed to load leaves', err);
    }
  };

  useEffect(() => {
    fetchLeaves(selectedDoctorId);
  }, [selectedDoctorId, doctors]);

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !leaveDate) return;
    setSubmitting(true);

    try {
      await api.post('/doctors/me/leaves', {
        leaveDate,
        reason: leaveReason,
      });
      alert('Leave registered. Patients with conflicting appointments were notified.');
      setLeaveDate('');
      setLeaveReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to record leave');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage message="Loading leave oversight dashboard..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Doctor Leave Oversight</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor scheduled doctor absences and automated patient conflict resolution.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Select Doctor
        </label>
        <Select
          options={doctors.map((d) => ({
            label: `${d.name} (${d.doctorProfile?.specialization || 'Physician'})`,
            value: d.id,
          }))}
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
        />
      </div>

      {/* Leave List Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <CalendarOff className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-slate-800">Upcoming Leave Schedule</h2>
        </div>

        {leaves.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3">
            No scheduled leaves on record for the selected doctor.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaves.map((l: any) => (
              <div key={l.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800">
                    {format(new Date(l.leaveDate), 'EEEE, MMMM d, yyyy')}
                  </p>
                  {l.reason && <p className="text-slate-500 text-[11px]">{l.reason}</p>}
                </div>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  Leave Booked
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
