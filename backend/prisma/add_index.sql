CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment 
ON "Appointment"("doctorId", "appointmentDate", "startTime") 
WHERE status IN ('BOOKED', 'CONFIRMED', 'HOLD');
