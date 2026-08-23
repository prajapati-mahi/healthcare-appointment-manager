import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Appointment } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingPage } from '../../components/common/LoadingPage';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Pill,
  FileText,
  Sparkles,
  ArrowLeft,
  CalendarCheck2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PatientAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/appointments/${id}`);
        setAppointment(res.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) return <LoadingPage message="Loading appointment details..." />;
  if (error || !appointment) {
    return (
      <ErrorState
        title="Appointment Not Found"
        message={error || 'Unable to retrieve this appointment.'}
        onRetry={() => navigate('/patient/appointments')}
      />
    );
  }

  let parsedSummary: any = null;
  if (appointment.patientFriendlySummary) {
    try {
      parsedSummary = JSON.parse(appointment.patientFriendlySummary);
    } catch {
      parsedSummary = { visitSummary: appointment.patientFriendlySummary };
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/patient/appointments')}
        className="text-xs text-slate-500 hover:text-slate-800 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Appointments
      </Button>

      {/* Header Info */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={appointment.status} />
              <span className="text-xs text-slate-400 font-mono">Ref: {appointment.id}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">
              Consultation with {appointment.doctor?.name}
            </h1>
          </div>

          {appointment.calendarSyncStatus === 'SYNCED' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              Synced to Google Calendar
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Stethoscope className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {appointment.doctor?.doctorProfile?.specialization || 'Physician'}
            </span>
          </div>
        </div>
      </Card>

      {/* Reported Symptoms */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Your Reported Symptoms</h3>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
          <p>
            <span className="font-bold text-slate-800">Chief Symptoms: </span>
            {appointment.symptoms || 'None recorded'}
          </p>
          {appointment.symptomDuration && (
            <p>
              <span className="font-bold text-slate-800">Duration: </span>
              {appointment.symptomDuration}
            </p>
          )}
          {appointment.symptomSeverity && (
            <p>
              <span className="font-bold text-slate-800">Severity: </span>
              {appointment.symptomSeverity}
            </p>
          )}
          {appointment.additionalInfo && (
            <p>
              <span className="font-bold text-slate-800">Additional History: </span>
              {appointment.additionalInfo}
            </p>
          )}
        </div>
      </Card>

      {/* Doctor Approved Post-Visit Summary */}
      {appointment.status === 'COMPLETED' && parsedSummary && (
        <Card className="p-6 bg-gradient-to-br from-teal-50/50 to-blue-50/50 border-teal-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Doctor-Approved Patient Care Summary
                </h3>
                <p className="text-[11px] text-teal-700">
                  Reviewed and released by {appointment.doctor?.name}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full uppercase">
              Approved
            </span>
          </div>

          {/* Visit Summary */}
          {parsedSummary.visitSummary && (
            <div className="bg-white/80 p-4 rounded-2xl border border-teal-100 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">Visit Overview:</p>
              <p>{parsedSummary.visitSummary}</p>
            </div>
          )}

          {/* Key Instructions */}
          {parsedSummary.keyInstructions?.length > 0 && (
            <div className="bg-white/80 p-4 rounded-2xl border border-teal-100 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Key Instructions for Care:</p>
              <ul className="list-disc pl-4 space-y-1">
                {parsedSummary.keyInstructions.map((inst: string, i: number) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Prescribed Medication Schedule */}
          {parsedSummary.medicationSchedule?.length > 0 && (
            <div className="bg-white/80 p-4 rounded-2xl border border-teal-100 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Medication Routine:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {parsedSummary.medicationSchedule.map((med: any, i: number) => (
                  <div key={i} className="p-2.5 bg-teal-50/60 rounded-xl border border-teal-100">
                    <p className="font-bold text-teal-900">{med.name} - {med.dosage}</p>
                    <p className="text-[11px] text-teal-700 font-medium">{med.frequency}</p>
                    {med.instructions && (
                      <p className="text-[10px] text-slate-500 mt-1">{med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings & Precautions */}
          {parsedSummary.warnings?.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-1 text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Important Warnings:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {parsedSummary.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Prescriptions & Medications List */}
      {appointment.medications && appointment.medications.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Prescribed Medications</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appointment.medications.map((m) => (
              <div key={m.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800">{m.name}</h4>
                  <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full text-[10px]">
                    {m.frequency}
                  </span>
                </div>
                <p className="text-slate-500 font-medium mt-1">Dosage: {m.dosage}</p>
                <p className="text-slate-500">Duration: {m.durationDays} days</p>
                {m.instructions && (
                  <p className="text-slate-600 mt-2 bg-white p-2 rounded-lg border border-slate-100">
                    {m.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
