import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { Appointment, Medication } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Calendar, Pill, Search, Stethoscope, ArrowRight } from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, medsRes] = await Promise.all([
          api.get('/appointments/my?limit=3'),
          api.get('/medications/my?activeOnly=true'),
        ]);
        setAppointments(apptsRes.data.data || []);
        setMedications(medsRes.data.data || []);
      } catch (err) {
        console.error('Dashboard load failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingPage message="Loading your dashboard..." />;

  const upcomingCount = appointments.filter((a) =>
    ['BOOKED', 'CONFIRMED'].includes(a.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Patient Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-blue-100 text-sm sm:text-base mb-6 leading-relaxed">
            Manage your medical appointments, review AI-assisted visit summaries, and track your
            prescribed medication reminders in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="bg-white text-blue-700 hover:bg-blue-50 border-none font-bold"
              onClick={() => navigate('/patient/doctors')}
            >
              <Search className="w-4 h-4 mr-2" />
              Find a Doctor
            </Button>
            <Button
              variant="outline"
              className="text-white border-white/40 hover:bg-white/10"
              onClick={() => navigate('/patient/appointments')}
            >
              View Appointments
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Upcoming Visits
            </p>
            <h3 className="text-2xl font-black text-slate-800">{upcomingCount}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Medications
            </p>
            <h3 className="text-2xl font-black text-slate-800">{medications.length}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Appointments
            </p>
            <h3 className="text-2xl font-black text-slate-800">{appointments.length}</h3>
          </div>
        </Card>
      </div>

      {/* Recent / Upcoming Appointments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Your Recent Appointments</h2>
            <p className="text-xs text-slate-500">Upcoming consultations and history</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patient/appointments')}
            className="text-xs text-blue-600"
          >
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {appointments.length === 0 ? (
          <Card className="p-8 text-center bg-white">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">No appointments yet</h3>
            <p className="text-xs text-slate-500 mb-4">
              Schedule your first doctor visit today.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/patient/doctors')}>
              Book Consultation
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                role="PATIENT"
                onView={(id) => navigate(`/patient/appointments/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Medications Preview */}
      {medications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Active Prescriptions</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patient/medications')}
              className="text-xs text-teal-600"
            >
              Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {medications.slice(0, 3).map((m) => (
              <Card key={m.id} className="p-4 bg-white border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{m.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{m.dosage}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {m.frequency}
                  </span>
                </div>
                {m.instructions && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                    {m.instructions}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
