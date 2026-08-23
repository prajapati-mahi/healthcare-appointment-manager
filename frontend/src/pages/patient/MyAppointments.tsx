import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Appointment, TimeSlot } from '../../types';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { SlotPicker } from '../../components/common/SlotPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  );
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState<TimeSlot | null>(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/appointments/my' : `/appointments/my?status=${statusFilter}`;
      const res = await api.get(url);
      setAppointments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!selectedApptId) return;
    setCancelling(true);
    try {
      await api.post(`/appointments/${selectedApptId}/cancel`, {
        reason: cancelReason,
      });
      setCancelModalOpen(false);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    setRescheduleAppt(appt);
    setSelectedNewSlot(null);
    setRescheduleError(null);
    setRescheduleModalOpen(true);
  };

  // Fetch slots for reschedule
  useEffect(() => {
    if (!rescheduleAppt || !rescheduleModalOpen) return;
    const fetchSlots = async () => {
      setLoadingRescheduleSlots(true);
      try {
        const res = await api.get(
          `/availability/slots?doctorId=${rescheduleAppt.doctorId}&date=${rescheduleDate}`
        );
        setRescheduleSlots(res.data.data || []);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoadingRescheduleSlots(false);
      }
    };
    fetchSlots();
  }, [rescheduleAppt, rescheduleDate, rescheduleModalOpen]);

  // Execute Reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleAppt || !selectedNewSlot) return;
    setRescheduling(true);
    setRescheduleError(null);

    try {
      // 1. Hold new slot
      const holdRes = await api.post('/availability/hold', {
        doctorId: rescheduleAppt.doctorId,
        date: rescheduleDate,
        startTime: selectedNewSlot.startTime,
        endTime: selectedNewSlot.endTime,
      });

      const holdId = holdRes.data.data.holdId;

      // 2. Call reschedule API
      await api.post(`/appointments/${rescheduleAppt.id}/reschedule`, {
        newDate: rescheduleDate,
        newStartTime: selectedNewSlot.startTime,
        newEndTime: selectedNewSlot.endTime,
        newHoldId: holdId,
      });

      setRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setRescheduleError(err.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">My Medical Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, reschedule, or review your doctor consultations and medical summaries.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/patient/book')}>
          <Plus className="w-4 h-4 mr-1.5" /> Book Consultation
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {['ALL', 'BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <LoadingPage message="Retrieving appointments..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments found"
          description={
            statusFilter === 'ALL'
              ? 'You have not booked any appointments yet.'
              : `No appointments with status "${statusFilter}".`
          }
          actionText="Book an Appointment"
          onAction={() => navigate('/patient/book')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              role="PATIENT"
              onView={(id) => navigate(`/patient/appointments/${id}`)}
              onCancel={(id) => {
                setSelectedApptId(id);
                setCancelModalOpen(true);
              }}
              onReschedule={openRescheduleModal}
            />
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </p>
          <Textarea
            label="Reason for Cancellation (Optional)"
            placeholder="Please provide a brief reason..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={cancelling}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        maxWidth="lg"
      >
        {rescheduleAppt && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Select a new date and time slot for your consultation with{' '}
              <span className="font-semibold text-slate-800">{rescheduleAppt.doctor?.name}</span>.
            </p>

            {rescheduleError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {rescheduleError}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Date
              </label>
              <Input
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Available Slots
              </label>
              <SlotPicker
                slots={rescheduleSlots}
                selectedSlot={selectedNewSlot?.startTime || null}
                onSelectSlot={(slot) => setSelectedNewSlot(slot)}
                loading={loadingRescheduleSlots}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!selectedNewSlot}
                onClick={handleConfirmReschedule}
                isLoading={rescheduling}
              >
                Confirm New Slot
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
