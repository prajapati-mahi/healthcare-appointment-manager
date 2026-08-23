import React from 'react';
import type { TimeSlot } from '../../types';
import { Clock } from 'lucide-react';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  loading?: boolean;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">No time slots available for this date.</p>
        <p className="text-xs text-slate-400 mt-0.5">Please try another date or check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.startTime;
        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={!slot.available}
            onClick={() => slot.available && onSelectSlot(slot)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all border ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20 ring-2 ring-blue-500/30'
                : slot.available
                ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                : 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed'
            }`}
          >
            {slot.startTime}
          </button>
        );
      })}
    </div>
  );
};
