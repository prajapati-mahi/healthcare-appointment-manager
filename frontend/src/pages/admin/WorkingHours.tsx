import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Clock, CheckCircle2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminWorkingHours() {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loading, setLoading] = useState(true);

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

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const workingHours = selectedDoctor?.doctorProfile?.workingHours || [];

  if (loading) return <LoadingPage message="Loading doctor schedule directory..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Doctor Working Schedule Directory</h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect configured weekly shifts and consultation availability per doctor.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Select Physician
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

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">
            {selectedDoctor?.name}'s Weekly Schedule
          </h2>
        </div>

        <div className="space-y-2">
          {workingHours.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Default schedule: Monday - Friday (09:00 - 17:00)
            </p>
          ) : (
            workingHours.map((wh) => (
              <div
                key={wh.id || wh.dayOfWeek}
                className="py-2.5 px-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
              >
                <span className="font-bold text-slate-800 w-28">{DAYS[wh.dayOfWeek]}</span>
                <span className="text-slate-600 font-mono">
                  {wh.startTime} - {wh.endTime}
                </span>
                <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
