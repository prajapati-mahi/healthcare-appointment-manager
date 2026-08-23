import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { DoctorProfile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  Stethoscope,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Award,
} from 'lucide-react';

export default function DoctorProfilePage() {
  const { user, refreshUser } = useContext(AuthContext);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [slotDuration, setSlotDuration] = useState(30);
  const [consultationFee, setConsultationFee] = useState(500);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calendar State
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profRes, calRes] = await Promise.all([
          api.get('/doctors/me/profile'),
          api.get('/calendar/status').catch(() => ({ data: { data: { connected: false } } })),
        ]);
        const p: DoctorProfile = profRes.data.data;
        setProfile(p);
        setName(user?.name || '');
        setSpecialization(p.specialization || '');
        setQualifications(p.qualifications || '');
        setBio(p.bio || '');
        setExperienceYears(p.experienceYears || 0);
        setSlotDuration(p.slotDuration || 30);
        setConsultationFee(p.consultationFee || 500);
        setCalendarConnected(calRes.data.data?.connected || false);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await Promise.all([
        api.patch('/users/me', { name }),
        api.patch('/doctors/me/profile', {
          specialization,
          qualifications,
          bio,
          experienceYears: Number(experienceYears),
          slotDuration: Number(slotDuration),
          consultationFee: Number(consultationFee),
        }),
      ]);
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await api.get('/calendar/auth');
      if (res.data.data?.url) window.location.href = res.data.data.url;
      else alert(res.data.message || 'Google Calendar not configured');
    } catch (err: any) {
      alert(err.message || 'Could not initiate calendar sync');
    }
  };

  if (loading) return <LoadingPage message="Loading physician credentials..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Doctor Profile & Practice Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Maintain your clinical credentials, consultation duration, and synchronization settings.
        </p>
      </div>

      {/* Calendar Integration */}
      <Card className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Google Calendar Appointment Sync</h3>
              <p className="text-xs text-slate-500">
                {calendarConnected
                  ? 'All booked patient visits automatically sync to your Google Calendar.'
                  : 'Sync your clinic schedule with Google Calendar to prevent scheduling clashes.'}
              </p>
            </div>
          </div>

          <div>
            {!calendarConnected && (
              <Button variant="primary" size="sm" onClick={handleConnectCalendar}>
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Practice Details Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Professional Credentials</h2>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Practice settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Doctor Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Primary Specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Cardiology, Pediatrics"
              required
            />
            <Input
              label="Medical Qualifications"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g. MBBS, MD, DM"
              required
            />
            <Input
              label="Experience (Years)"
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />
            <Select
              label="Slot Duration"
              options={[
                { label: '15 Minutes', value: 15 },
                { label: '20 Minutes', value: 20 },
                { label: '30 Minutes (Recommended)', value: 30 },
                { label: '45 Minutes', value: 45 },
                { label: '60 Minutes', value: 60 },
              ]}
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              value={consultationFee}
              onChange={(e) => setConsultationFee(Number(e.target.value))}
            />
          </div>

          <Textarea
            label="Professional Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Brief introduction for patients browsing your profile..."
            rows={4}
          />

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="primary" type="submit" isLoading={saving}>
              Save Practice Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
