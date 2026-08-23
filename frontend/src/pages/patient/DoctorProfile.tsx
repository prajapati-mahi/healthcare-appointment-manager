import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingPage } from '../../components/common/LoadingPage';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Stethoscope,
  Award,
  Clock,
  IndianRupee,
  Calendar,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await api.get(`/doctors/${id}`);
        setDoctor(res.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoctor();
  }, [id]);

  if (loading) return <LoadingPage message="Loading doctor profile..." />;
  if (error || !doctor) {
    return (
      <ErrorState
        title="Doctor Not Found"
        message={error || 'Unable to retrieve the requested doctor.'}
        onRetry={() => navigate('/patient/doctors')}
      />
    );
  }

  const profile = doctor.doctorProfile;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/patient/doctors')}
        className="text-xs text-slate-500 hover:text-slate-800 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Search
      </Button>

      {/* Header Card */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {doctor.name.replace('Dr. ', '').charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">{doctor.name}</h1>
              <p className="text-sm font-semibold text-teal-600 flex items-center gap-1.5 mt-1">
                <Stethoscope className="w-4 h-4" />
                {profile?.specialization}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                {profile?.qualifications}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto shadow-md"
            onClick={() => navigate(`/patient/book?doctorId=${doctor.id}`)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book Consultation
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bio & Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-3">About the Doctor</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {profile?.bio ||
                'Dedicated medical practitioner providing high-quality comprehensive patient care, preventive diagnostics, and personalized treatment plans.'}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Weekly Working Hours</h3>
            <div className="space-y-2">
              {profile?.workingHours && profile.workingHours.length > 0 ? (
                profile.workingHours.map((wh) => (
                  <div
                    key={wh.id || wh.dayOfWeek}
                    className="flex items-center justify-between py-2 border-b border-slate-50 text-xs"
                  >
                    <span className="font-semibold text-slate-700 w-16">
                      {daysOfWeek[wh.dayOfWeek]}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {wh.startTime} - {wh.endTime}
                    </span>
                    <span className="inline-flex items-center text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Regular hours Mon-Fri (09:00 - 17:00)</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Consultation Details */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Consultation Details</h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Slot Duration</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {profile?.slotDuration || 30} mins per visit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Consultation Fee</p>
                  <p className="font-bold text-slate-800 text-sm">
                    ₹{profile?.consultationFee || 500}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Clinical Experience</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {profile?.experienceYears || 5}+ Years
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
