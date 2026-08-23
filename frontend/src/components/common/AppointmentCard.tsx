import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Calendar, Clock, User as UserIcon, AlertCircle } from 'lucide-react';
import type { Appointment } from '../../types';
import { format } from 'date-fns';

interface AppointmentCardProps {
  appointment: Appointment;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  onView?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onComplete?: (id: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  role,
  onView,
  onCancel,
  onReschedule,
  onComplete,
}) => {
  const isUpcoming = ['BOOKED', 'CONFIRMED'].includes(appointment.status);
  const formattedDate = appointment.appointmentDate
    ? format(new Date(appointment.appointmentDate), 'EEE, MMM d, yyyy')
    : '';

  const counterpartyName =
    role === 'PATIENT'
      ? appointment.doctor?.name || 'Doctor'
      : appointment.patient?.name || 'Patient';

  return (
    <Card className="p-4 sm:p-5 hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <StatusBadge status={appointment.status} />
          {appointment.urgencyLevel && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                appointment.urgencyLevel === 'HIGH'
                  ? 'bg-rose-100 text-rose-700'
                  : appointment.urgencyLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              AI: {appointment.urgencyLevel} Urgency
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          ID: {appointment.id.slice(0, 8)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-800">{counterpartyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>
            {appointment.startTime} - {appointment.endTime}
          </span>
        </div>
        {appointment.symptoms && (
          <div className="flex items-start gap-2 col-span-1 sm:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-slate-600 line-clamp-2">
              <span className="font-semibold text-slate-700">Symptoms: </span>
              {appointment.symptoms}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50 justify-end">
        {onView && (
          <Button variant="outline" size="sm" onClick={() => onView(appointment.id)}>
            View Details
          </Button>
        )}
        {role === 'PATIENT' && isUpcoming && onReschedule && (
          <Button variant="outline" size="sm" onClick={() => onReschedule(appointment.id)}>
            Reschedule
          </Button>
        )}
        {role === 'PATIENT' && isUpcoming && onCancel && (
          <Button variant="danger" size="sm" onClick={() => onCancel(appointment.id)}>
            Cancel
          </Button>
        )}
        {role === 'DOCTOR' && isUpcoming && onComplete && (
          <Button variant="primary" size="sm" onClick={() => onComplete(appointment.id)}>
            Add Notes / Complete
          </Button>
        )}
      </div>
    </Card>
  );
};
