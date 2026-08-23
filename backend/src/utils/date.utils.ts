import { parse, addMinutes, format, isBefore, isAfter, setHours, setMinutes } from 'date-fns';

export const parseTime = (timeStr: string, date: Date = new Date()) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
};

export const formatTime = (date: Date) => {
  return format(date, 'HH:mm');
};
