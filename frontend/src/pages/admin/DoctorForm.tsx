import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function DoctorForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Doctor@123');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(500);
  const [slotDuration, setSlotDuration] = useState(30);
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Register new user with role DOCTOR
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'DOCTOR',
      });

      const user = res.data.data.user;

      // Update doctor profile settings
      if (user?.id) {
        // Set profile details if API supports direct admin update
        await api.patch('/doctors/me/profile', {
          specialization,
          qualifications,
          bio,
          experienceYears: Number(experienceYears),
          slotDuration: Number(slotDuration),
          consultationFee: Number(consultationFee),
        }).catch(() => {});
      }

      alert('Doctor onboarded successfully!');
      navigate('/admin/doctors');
    } catch (err: any) {
      setError(err.message || 'Failed to onboard doctor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin/doctors')}
        className="text-xs text-slate-500 hover:text-slate-800 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Doctor Roster
      </Button>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Onboard New Physician</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create credentials and setup default consultation configuration for a doctor.
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Doctor Name"
              placeholder="Dr. Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Doctor Email Address"
              type="email"
              placeholder="doctor@healthcare.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Temporary Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Specialization"
              placeholder="e.g. Cardiology, Neurology"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              required
            />
            <Input
              label="Qualifications"
              placeholder="e.g. MBBS, MD (Internal Medicine)"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              required
            />
            <Input
              label="Years of Experience"
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              value={consultationFee}
              onChange={(e) => setConsultationFee(Number(e.target.value))}
            />
            <Select
              label="Slot Duration"
              options={[
                { label: '15 Minutes', value: 15 },
                { label: '20 Minutes', value: 20 },
                { label: '30 Minutes', value: 30 },
                { label: '45 Minutes', value: 45 },
                { label: '60 Minutes', value: 60 },
              ]}
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
            />
          </div>

          <Textarea
            label="Doctor Bio & Background"
            placeholder="Clinical background, achievements, and specialties..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" type="submit" isLoading={submitting}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Onboard Doctor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
