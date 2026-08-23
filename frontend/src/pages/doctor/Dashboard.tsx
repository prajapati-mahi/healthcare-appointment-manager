import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { Appointment } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const res = await api.get('/appointments/doctor/today');
        setTodayAppointments(res.data.data || []);
      } catch (err) {
        console.error('Failed to load today appointments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchToday();
  }, []);

  if (loading) return <LoadingPage message="Loading clinic overview..." />;

  const highUrgencyCount = todayAppointments.filter(
    (a) => a.urgencyLevel === 'HIGH'
  ).length;

  const completedCount = todayAppointments.filter(
    (a) => a.status === 'COMPLETED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/10">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Physician Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">
            Good day, {user?.name}!
          </h1>
          <p className="text-blue-100 text-sm mb-4">
            Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}. You have{' '}
            <strong className="text-white">{todayAppointments.length} patient consultations</strong> scheduled for today.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="bg-white text-indigo-700 hover:bg-indigo-50 border-none font-bold"
              onClick={() => navigate('/doctor/appointments')}
            >
              View Full Schedule
            </Button>
            <Button
              variant="outline"
              className="text-white border-white/40 hover:bg-white/10"
              onClick={() => navigate('/doctor/availability')}
            >
              Update Hours / Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Patients
            </p>
            <h3 className="text-2xl font-black text-slate-800">{todayAppointments.length}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              High Urgency (AI)
            </p>
            <h3 className="text-2xl font-black text-rose-600">{highUrgencyCount}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Today
            </p>
            <h3 className="text-2xl font-black text-slate-800">{completedCount}</h3>
          </div>
        </Card>
      </div>

      {/* Today's Consultations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Today's Consultations</h2>
            <p className="text-xs text-slate-500">Patients booked for today in chronological order</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/doctor/appointments')}
            className="text-xs text-blue-600"
          >
            All Appointments <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {todayAppointments.length === 0 ? (
          <Card className="p-8 text-center bg-white">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">No consultations scheduled today</h3>
            <p className="text-xs text-slate-500">
              Your calendar is free for today. Check upcoming appointments for future bookings.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayAppointments.map((appt) => (
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
    </div>
  );
}
