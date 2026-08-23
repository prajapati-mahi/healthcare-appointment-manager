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
  User,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  HelpCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorAppointmentDetail() {
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

  if (loading) return <LoadingPage message="Loading patient consultation record..." />;
  if (error || !appointment) {
    return (
      <ErrorState
        title="Consultation Not Found"
        message={error || 'Could not find the requested record.'}
        onRetry={() => navigate('/doctor/appointments')}
      />
    );
  }

  const isCompleted = appointment.status === 'COMPLETED';
  const hasAISummary = appointment.preVisitSummaryStatus === 'GENERATED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/doctor/appointments')}
        className="text-xs text-slate-500 hover:text-slate-800 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Appointments
      </Button>

      {/* Header Info */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={appointment.status} />
              <span className="text-xs text-slate-400 font-mono">Ref: {appointment.id}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">
              Patient: {appointment.patient?.name}
            </h1>
          </div>

          <div className="flex gap-2">
            {!isCompleted && ['BOOKED', 'CONFIRMED'].includes(appointment.status) && (
              <Button
                variant="primary"
                onClick={() => navigate(`/doctor/appointments/${appointment.id}/post-visit`)}
              >
                Complete & Add Notes <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {isCompleted && (
              <Button
                variant="outline"
                onClick={() => navigate(`/doctor/appointments/${appointment.id}/post-visit`)}
              >
                View / Edit Notes
              </Button>
            )}
          </div>
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
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">
              Email: {appointment.patient?.email || 'N/A'}
            </span>
          </div>
        </div>
      </Card>

      {/* AI Pre-Visit Clinical Summary Box */}
      <Card
        className={`p-6 border ${
          hasAISummary
            ? 'bg-gradient-to-br from-indigo-50/50 via-blue-50/30 to-purple-50/40 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-indigo-100/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pre-Visit AI Clinical Summary
              </h2>
              <p className="text-[11px] text-indigo-700">
                Synthesized triage assist for the physician
              </p>
            </div>
          </div>

          {appointment.urgencyLevel && (
            <span
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                appointment.urgencyLevel === 'HIGH'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : appointment.urgencyLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {appointment.urgencyLevel} Urgency
            </span>
          )}
        </div>

        {hasAISummary ? (
          <div className="space-y-4 text-xs text-slate-700">
            {/* Chief Complaint */}
            {appointment.chiefComplaint && (
              <div className="bg-white/80 p-3.5 rounded-2xl border border-indigo-100">
                <span className="font-bold text-slate-900 block mb-1">
                  Synthesized Chief Complaint:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {appointment.chiefComplaint}
                </p>
              </div>
            )}

            {/* Suggested Follow-up Questions */}
            {appointment.suggestedQuestions && appointment.suggestedQuestions.length > 0 && (
              <div className="bg-white/80 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  Suggested Questions for Patient:
                </span>
                <ul className="space-y-1.5 pl-2">
                  {appointment.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-600">
                      <span className="font-bold text-indigo-600">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clinical Disclaimer */}
            <p className="text-[10px] text-slate-400 italic">
              * AI synthesis provided for clinical convenience. Physician retains full diagnostic responsibility.
            </p>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">AI summary unavailable</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Please review the patient's original submitted symptoms below.
            </p>
          </div>
        )}
      </Card>

      {/* Original Patient Submitted Symptoms */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Patient Self-Reported Symptoms
          </h3>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
          <p>
            <strong className="text-slate-800">Reported Symptoms: </strong>
            {appointment.symptoms || 'None recorded'}
          </p>
          {appointment.symptomDuration && (
            <p>
              <strong className="text-slate-800">Duration: </strong>
              {appointment.symptomDuration}
            </p>
          )}
          {appointment.symptomSeverity && (
            <p>
              <strong className="text-slate-800">Severity: </strong>
              {appointment.symptomSeverity}
            </p>
          )}
          {appointment.additionalInfo && (
            <p>
              <strong className="text-slate-800">Medical Notes: </strong>
              {appointment.additionalInfo}
            </p>
          )}
        </div>
      </Card>

      {/* If completed, show post-visit clinical documentation */}
      {isCompleted && appointment.postVisitNotes && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Post-Visit Clinical Notes</h3>
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Completed
            </span>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap">
            {appointment.postVisitNotes}
          </div>
        </Card>
      )}
    </div>
  );
}
