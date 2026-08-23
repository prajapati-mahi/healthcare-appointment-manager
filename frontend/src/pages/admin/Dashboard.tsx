import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  Users,
  UserCheck,
  Calendar,
  BellRing,
  AlertTriangle,
  ArrowRight,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingNotifications: number;
  calendarFailed: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingPage message="Loading system analytics..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">System Administration & Telemetry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global healthcare operations, appointment metrics, and notification queue health.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/admin/doctors/new')}>
          <Plus className="w-4 h-4 mr-1.5" /> Onboard Doctor
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Doctors
            </p>
            <h3 className="text-2xl font-black text-slate-800">{stats?.totalDoctors || 0}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered Patients
            </p>
            <h3 className="text-2xl font-black text-slate-800">{stats?.totalPatients || 0}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Consultations
            </p>
            <h3 className="text-2xl font-black text-slate-800">{stats?.totalAppointments || 0}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending / Failed Notifs
            </p>
            <h3 className="text-2xl font-black text-amber-600">{stats?.pendingNotifications || 0}</h3>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Doctor Roster & Schedules</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Manage doctor qualifications, consultation fees, weekly availability, and credentials.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/doctors')}
            className="w-full justify-between"
          >
            Manage Doctors <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl w-fit mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Appointment Oversight</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Filter and view all system bookings across all doctors, inspect statuses, and view audit history.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/appointments')}
            className="w-full justify-between"
          >
            All Appointments <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-3">
              <BellRing className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Email & Queue Retries</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Monitor BullMQ background notification delivery rates, view failed jobs, and trigger retries.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/notifications')}
            className="w-full justify-between"
          >
            Notification Logs <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
