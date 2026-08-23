import { parseTime, formatTime } from './date.utils';
import { addMinutes, isBefore } from 'date-fns';

export const generateTimeSlots = (startTime: string, endTime: string, slotDuration: number, baseDate: Date) => {
  const start = parseTime(startTime, baseDate);
  const end = parseTime(endTime, baseDate);
  const slots: string[] = [];
  
  let current = start;
  while (isBefore(current, end) || current.getTime() === end.getTime()) {
    slots.push(formatTime(current));
    current = addMinutes(current, slotDuration);
  }
  
  // Exclude the end time itself if it forms an incomplete slot
  if (slots.length > 0 && slots[slots.length - 1] === endTime) {
    slots.pop();
  }
  
  return slots;
};
