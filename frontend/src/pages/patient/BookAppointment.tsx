import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { User, TimeSlot } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { SlotPicker } from '../../components/common/SlotPicker';
import { DoctorCard } from '../../components/common/DoctorCard';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedDoctorId = searchParams.get('doctorId');

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  );
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Slot Hold State
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 mins in secs

  // Symptom Form State
  const [symptoms, setSymptoms] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState('Moderate');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Booking Result State
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // 1. Fetch doctors list
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/doctors');
        const docs: User[] = res.data.data || [];
        setDoctors(docs);

        if (preselectedDoctorId) {
          const found = docs.find((d) => d.id === preselectedDoctorId);
          if (found) {
            setSelectedDoctor(found);
            setStep(2); // Jump to date selection
          }
        }
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    init();
  }, [preselectedDoctorId]);

  // 2. Fetch available slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await api.get(
          `/availability/slots?doctorId=${selectedDoctor.id}&date=${selectedDate}`
        );
        setSlots(res.data.data || []);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // 3. Countdown timer for active slot hold
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setHoldId(null);
        setHoldExpiresAt(null);
        setBookingError('Slot hold expired. Please select a time slot again.');
        setStep(3); // Go back to slot selection
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // Handler: Reserve / Hold slot
  const handleSelectSlot = async (slot: TimeSlot) => {
    if (!selectedDoctor) return;
    setSelectedSlot(slot);
    setBookingError(null);

    try {
      const res = await api.post('/availability/hold', {
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

      const data = res.data.data;
      setHoldId(data.holdId);
      const expiry = new Date(data.expiresAt);
      setHoldExpiresAt(expiry);
      setTimeLeft(data.expiresInSeconds || 300);
      setStep(4); // Move to symptoms step
    } catch (err: any) {
      setBookingError(err.message || 'Could not hold this slot. It may be currently reserved.');
    }
  };

  // Handler: Final Appointment Booking
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot || !holdId) return;
    setSubmitting(true);
    setBookingError(null);

    try {
      const res = await api.post('/appointments', {
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        holdId,
        symptoms,
        symptomDuration,
        symptomSeverity,
        additionalInfo,
      });

      setBookedAppointment(res.data.data);
      setHoldId(null); // Clear hold
      setHoldExpiresAt(null);
      setStep(6); // Success Step
    } catch (err: any) {
      setBookingError(
        err.message || 'Booking transaction failed. Please choose another slot.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) return <LoadingPage message="Setting up appointment wizard..." />;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Progress Header */}
      {step < 6 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>Step {step} of 5</span>
            {holdExpiresAt && (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                <Timer className="w-3.5 h-3.5" /> Slot held: {formatTimer(timeLeft)}
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {bookingError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* STEP 1: Select Doctor */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Select a Doctor</h2>
            <p className="text-xs text-slate-500">Choose the physician you'd like to consult</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoctor(doc);
                  setStep(2);
                }}
                className="cursor-pointer"
              >
                <DoctorCard doctor={doc} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Select Date */}
      {step === 2 && selectedDoctor && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Choose Appointment Date</h2>
              <p className="text-xs text-slate-500">
                Consulting with <span className="font-semibold text-slate-700">{selectedDoctor.name}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Change Doctor
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Date
            </label>
            <Input
              type="date"
              min={format(new Date(), 'yyyy-MM-dd')}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="primary" onClick={() => setStep(3)}>
              Continue to Slots <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Select Slot & Hold */}
      {step === 3 && selectedDoctor && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Select Available Time Slot</h2>
              <p className="text-xs text-slate-500">
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} with {selectedDoctor.name}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              Change Date
            </Button>
          </div>

          <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              Selecting a time slot will reserve it exclusively for you for 5 minutes while you enter your details.
            </span>
          </div>

          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot?.startTime || null}
            onSelectSlot={handleSelectSlot}
            loading={loadingSlots}
          />
        </Card>
      )}

      {/* STEP 4: Symptoms & Medical Info */}
      {step === 4 && (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pre-Visit Symptom Information</h2>
            <p className="text-xs text-slate-500">
              Provide details so our AI can prepare clinical context for your physician
            </p>
          </div>

          <div className="space-y-4">
            <Textarea
              label="Primary Symptoms (Required)"
              placeholder="e.g., Persistent dry cough, mild throat pain, fatigue..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Duration of Symptoms"
                placeholder="e.g., 3 days, 1 week..."
                value={symptomDuration}
                onChange={(e) => setSymptomDuration(e.target.value)}
              />

              <Select
                label="Perceived Severity"
                options={[
                  { label: 'Mild - Minor discomfort', value: 'Mild' },
                  { label: 'Moderate - Noticeable interference', value: 'Moderate' },
                  { label: 'Severe - Significant impact', value: 'Severe' },
                ]}
                value={symptomSeverity}
                onChange={(e) => setSymptomSeverity(e.target.value)}
              />
            </div>

            <Textarea
              label="Additional Notes / Medical History (Optional)"
              placeholder="e.g., Currently taking blood pressure medication, allergy to penicillin..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={2}
            />
          </div>

          {/* AI Clinical Disclaimer */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">Clinical AI Assist Notice: </span>
            This preliminary summary is securely synthesized to assist the physician prior to your visit.
            It does not replace professional medical judgment or diagnosis.
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              variant="primary"
              disabled={!symptoms.trim()}
              onClick={() => setStep(5)}
            >
              Review Booking <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: Review & Confirm Booking */}
      {step === 5 && selectedDoctor && selectedSlot && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Review & Confirm Appointment</h2>
            <p className="text-xs text-slate-500">Verify your consultation details before finalizing</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Doctor:</span>
              <span className="font-bold text-slate-800">{selectedDoctor.name} ({selectedDoctor.doctorProfile?.specialization})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Date:</span>
              <span className="font-bold text-slate-800">{format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Time:</span>
              <span className="font-bold text-slate-800">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Consultation Fee:</span>
              <span className="font-bold text-slate-800">₹{selectedDoctor.doctorProfile?.consultationFee || 500}</span>
            </div>
            <div className="py-1">
              <span className="text-slate-500 block mb-1">Reported Symptoms:</span>
              <p className="font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                {symptoms} ({symptomSeverity} severity, {symptomDuration || 'duration unstated'})
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(4)} disabled={submitting}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Edit Info
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmBooking}
              isLoading={submitting}
              className="shadow-md shadow-blue-500/20"
            >
              Confirm Appointment
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 6: Confirmation Screen */}
      {step === 6 && bookedAppointment && (
        <Card className="p-8 text-center space-y-6 bg-white">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Appointment Confirmed!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your appointment has been securely registered in the system.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Appointment Reference:</span>
              <span className="font-mono font-bold text-slate-800">{bookedAppointment.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Physician:</span>
              <span className="font-bold text-slate-800">{bookedAppointment.doctor?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-bold text-slate-800">
                {bookedAppointment.appointmentDate?.slice(0, 10)} at {bookedAppointment.startTime}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Confirmation Email:</span>
              <span className="text-emerald-600 font-semibold">Queued for Delivery</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/patient/appointments/${bookedAppointment.id}`)}
            >
              View Appointment Details
            </Button>
            <Button variant="primary" onClick={() => navigate('/patient/appointments')}>
              My Appointments List
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
