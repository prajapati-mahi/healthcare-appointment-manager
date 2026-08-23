import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { DoctorProfile, WorkingHours } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  Clock,
  CalendarOff,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorAvailability() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [workingHours, setWorkingHours] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>
  >([]);
  const [leaves, setLeaves] = useState<Array<{ id: string; leaveDate: string; reason?: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Leave Form State
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [savingHours, setSavingHours] = useState(false);
  const [addingLeave, setAddingLeave] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);

  const fetchProfileAndLeaves = async () => {
    try {
      const [profRes, leavesRes] = await Promise.all([
        api.get('/doctors/me/profile'),
        api.get('/doctors/me/leaves'),
      ]);
      const prof: DoctorProfile = profRes.data.data;
      setProfile(prof);
      setLeaves(leavesRes.data.data || []);

      // Initialize 7 days
      const currentHoursMap = new Map<number, WorkingHours>();
      (prof.workingHours || []).forEach((wh) => currentHoursMap.set(wh.dayOfWeek, wh));

      const fullWeek = [0, 1, 2, 3, 4, 5, 6].map((day) => {
        const existing = currentHoursMap.get(day);
        return {
          dayOfWeek: day,
          startTime: existing?.startTime || '09:00',
          endTime: existing?.endTime || '17:00',
          isActive: existing?.isActive ?? (day >= 1 && day <= 5), // default active Mon-Fri
        };
      });
      setWorkingHours(fullWeek);
    } catch (err) {
      console.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndLeaves();
  }, []);

  const handleToggleDay = (dayIdx: number) => {
    const next = [...workingHours];
    next[dayIdx].isActive = !next[dayIdx].isActive;
    setWorkingHours(next);
  };

  const handleTimeChange = (dayIdx: number, field: 'startTime' | 'endTime', val: string) => {
    const next = [...workingHours];
    next[dayIdx][field] = val;
    setWorkingHours(next);
  };

  const handleSaveWorkingHours = async () => {
    setSavingHours(true);
    setHoursSuccess(false);
    try {
      await api.put('/doctors/me/working-hours', { hours: workingHours });
      setHoursSuccess(true);
      setTimeout(() => setHoursSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update schedule');
    } finally {
      setSavingHours(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveDate) return;
    setAddingLeave(true);

    try {
      await api.post('/doctors/me/leaves', {
        leaveDate: newLeaveDate,
        reason: newLeaveReason || undefined,
      });
      setNewLeaveDate('');
      setNewLeaveReason('');
      fetchProfileAndLeaves();
      alert('Leave scheduled. Conflicting appointments were cancelled and patients notified.');
    } catch (err: any) {
      alert(err.message || 'Failed to add leave');
    } finally {
      setAddingLeave(false);
    }
  };

  const handleRemoveLeave = async (leaveId: string) => {
    if (!window.confirm('Cancel this leave entry?')) return;
    try {
      await api.delete(`/doctors/me/leaves/${leaveId}`);
      fetchProfileAndLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to remove leave');
    }
  };

  if (loading) return <LoadingPage message="Loading doctor schedule & leaves..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Schedule & Leave Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your standard weekly consultation hours and record planned time off.
        </p>
      </div>

      {/* Weekly Schedule Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Weekly Working Hours</h2>
          </div>
          {hoursSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="space-y-3">
          {workingHours.map((wh, idx) => (
            <div
              key={wh.dayOfWeek}
              className={`p-3.5 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                wh.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 w-40">
                <input
                  type="checkbox"
                  id={`day-${wh.dayOfWeek}`}
                  checked={wh.isActive}
                  onChange={() => handleToggleDay(idx)}
                  className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                />
                <label
                  htmlFor={`day-${wh.dayOfWeek}`}
                  className="text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {DAYS[wh.dayOfWeek]}
                </label>
              </div>

              {wh.isActive ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">From</span>
                  <input
                    type="time"
                    value={wh.startTime}
                    onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                  />
                  <span className="text-slate-400">To</span>
                  <input
                    type="time"
                    value={wh.endTime}
                    onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                  />
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Off Duty</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="primary" onClick={handleSaveWorkingHours} isLoading={savingHours}>
            Save Working Schedule
          </Button>
        </div>
      </Card>

      {/* Doctor Leave Management Card */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <CalendarOff className="w-5 h-5 text-rose-600" />
          <div>
            <h2 className="text-base font-bold text-slate-800">Doctor Leave Dates</h2>
            <p className="text-xs text-slate-500">
              Adding a leave date automatically cancels existing bookings and sends notification emails.
            </p>
          </div>
        </div>

        {/* Add Leave Form */}
        <form
          onSubmit={handleAddLeave}
          className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Record New Leave
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Leave Date"
              type="date"
              min={format(new Date(), 'yyyy-MM-dd')}
              value={newLeaveDate}
              onChange={(e) => setNewLeaveDate(e.target.value)}
              required
            />
            <Input
              label="Reason (Optional)"
              placeholder="e.g., Medical conference, personal leave"
              value={newLeaveReason}
              onChange={(e) => setNewLeaveReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="danger"
              size="sm"
              type="submit"
              isLoading={addingLeave}
              disabled={!newLeaveDate}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Leave & Notify Patients
            </Button>
          </div>
        </form>

        {/* Upcoming Leaves List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Scheduled Upcoming Leaves
          </h3>
          {leaves.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No upcoming leaves registered.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaves.map((l) => (
                <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">
                      {format(new Date(l.leaveDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                    {l.reason && <p className="text-slate-500 text-[11px]">{l.reason}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 p-1.5"
                    onClick={() => handleRemoveLeave(l.id)}
                    title="Remove leave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
