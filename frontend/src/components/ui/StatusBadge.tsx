import React from 'react';
import type { AppointmentStatus, UrgencyLevel } from '../../types';

interface StatusBadgeProps {
  status: AppointmentStatus | UrgencyLevel | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = (val: string) => {
    switch (val.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'BOOKED':
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HOLD':
      case 'RETRYING':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
      case 'DOCTOR_LEAVE':
      case 'DEAD_LETTER':
      case 'FAILED':
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RESCHEDULED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
        status
      )}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
