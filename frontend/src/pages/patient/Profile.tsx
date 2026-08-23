import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingPage } from '../../components/common/LoadingPage';
import { User, Calendar, Lock, CalendarCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PatientProfile() {
  const { user, refreshUser } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Calendar sync state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setGender(user.gender || '');
      setAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchCalendarStatus = async () => {
      try {
        const res = await api.get('/calendar/status');
        setCalendarConnected(res.data.data?.connected || false);
      } catch {
        // ignore
      } finally {
        setCalendarLoading(false);
      }
    };
    fetchCalendarStatus();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.patch('/users/me', { name, phone, gender, address });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await api.post('/users/me/password', { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await api.get('/calendar/auth');
      if (res.data.data?.url) {
        window.location.href = res.data.data.url;
      } else {
        alert(res.data.message || 'Google Calendar is not configured in this environment.');
      }
    } catch (err: any) {
      alert(err.message || 'Could not initiate calendar sync');
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!window.confirm('Disconnect Google Calendar sync?')) return;
    try {
      await api.post('/calendar/disconnect');
      setCalendarConnected(false);
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information, calendar sync, and password security.
        </p>
      </div>

      {/* Google Calendar Integration Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Google Calendar Sync</h3>
              <p className="text-xs text-slate-500">
                {calendarConnected
                  ? 'Your booked appointments automatically sync to your Google Calendar.'
                  : 'Connect your Google account for automatic appointment reminders.'}
              </p>
            </div>
          </div>

          <div>
            {calendarConnected ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-rose-600 hover:bg-rose-50"
                onClick={handleDisconnectCalendar}
              >
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleConnectCalendar}>
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Personal Info Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Personal Information</h3>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="e.g. Female / Male / Other"
            />
          </div>

          <Input
            label="Residential Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="City, State"
          />

          <div className="flex justify-end pt-2">
            <Button variant="primary" type="submit" isLoading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Lock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
        </div>

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Password changed successfully!
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" type="submit" isLoading={changingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
