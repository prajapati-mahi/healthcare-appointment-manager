const API = 'http://localhost:5000/api';

function getNextWeekday(daysAhead = 2): string {
  const d = new Date(Date.now() + 86400000 * daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

async function runVerification() {
  console.log('====================================================');
  console.log('🏥 HEALTHCARE SYSTEM END-TO-END FEATURE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  };

  let patientToken = '';
  let doctorToken = '';
  let adminToken = '';
  let doctorId = '';
  let patientId = '';
  let appointmentId = '';
  let holdId = '';

  // Helper fetcher
  async function api(path: string, options: RequestInit = {}) {
    const { headers, ...rest } = options;
    const res = await fetch(`${API}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...((headers as Record<string, string>) || {}),
      },
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}`);
    }
    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }
    return data;
  }

  // 1. Authentication & Roles
  await test('Patient Login (patient1@test.com)', async () => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'patient1@test.com', password: 'Patient@123' }),
    });
    patientToken = data.data.token;
    patientId = data.data.user.id;
    if (!patientToken) throw new Error('No patient token returned');
  });

  await test('Doctor Login (dr.smith@healthcare.dev)', async () => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dr.smith@healthcare.dev', password: 'Doctor@123' }),
    });
    doctorToken = data.data.token;
    doctorId = data.data.user.id;
    if (!doctorToken) throw new Error('No doctor token returned');
  });

  await test('Admin Login (admin@healthcare.dev)', async () => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@healthcare.dev', password: 'Admin@123' }),
    });
    adminToken = data.data.token;
    if (!adminToken) throw new Error('No admin token returned');
  });

  // 2. Doctor Search & Availability
  await test('Search Doctors by Specialization', async () => {
    const data = await api('/doctors?specialization=General Medicine');
    if (!data.data || data.data.length === 0) throw new Error('No doctors found');
  });

  // Pick a weekday with available working hours
  const testDate = getNextWeekday(Math.floor(Math.random() * 5) + 12);
  let testSlot = { startTime: '10:00', endTime: '10:30' };

  await test(`Get Doctor Working Schedule & Available Slots (${testDate})`, async () => {
    const data = await api(`/availability/slots?doctorId=${doctorId}&date=${testDate}`);
    const slots = data.data;
    if (!slots || slots.length === 0) throw new Error('No slots generated for ' + testDate);
    const available = slots.find((s: any) => s.available);
    if (!available) throw new Error('No available open slots for date ' + testDate);
    testSlot = available;
  });

  // 3. Slot Hold & Double-Booking Prevention
  await test('Patient Claims 5-Minute Slot Hold', async () => {
    const data = await api('/availability/hold', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctorId,
        date: testDate,
        startTime: testSlot.startTime,
        endTime: testSlot.endTime,
      }),
    });
    holdId = data.data.holdId;
    if (!holdId || data.data.expiresInSeconds <= 0) throw new Error('Invalid hold response');
  });

  await test('Simultaneous Booking Attempt Protected (Hold Claimed)', async () => {
    // Check slots; the held slot should now be unavailable to other users
    const holdCheck = await api(`/availability/slots?doctorId=${doctorId}&date=${testDate}`);
    const check = holdCheck.data.find((s: any) => s.startTime === testSlot.startTime);
    if (check && check.available !== false) throw new Error('Slot should be marked as unavailable while held');
  });

  // 4. Appointment Booking with Patient Symptoms
  await test('Patient Books Appointment with Symptoms & Hold ID', async () => {
    const data = await api('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctorId,
        date: testDate,
        startTime: testSlot.startTime,
        endTime: testSlot.endTime,
        holdId,
        symptoms: 'Throat ache, fever of 100.5F, fatigue for 2 days',
        symptomDuration: '2 days',
        symptomSeverity: 'Moderate',
        additionalInfo: 'No known drug allergies',
      }),
    });
    appointmentId = data.data.id;
    if (!appointmentId) throw new Error('Booking failed to create ID');
  });

  // 5. Pre-Visit AI Triage & Urgency Synthesis
  await test('Doctor Accesses Pre-Visit AI Summary & Triage', async () => {
    const data = await api(`/ai/pre-visit/${appointmentId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (!data.data.symptoms) throw new Error('Missing patient symptoms');
  });

  // 6. Doctor Consultation Completion & Post-Visit Notes
  await test('Doctor Completes Consultation with Notes & Diagnosis', async () => {
    await api(`/appointments/${appointmentId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        postVisitNotes: 'Acute viral pharyngitis. Prescribed paracetamol and warm saline gargles. Adequate hydration.',
        diagnosis: 'Acute Pharyngitis',
        followUpDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      }),
    });
  });

  // 7. Prescription & Medication Reminders
  await test('Doctor Adds Medication Schedule with Reminders', async () => {
    const data = await api('/medications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        appointmentId,
        patientId,
        name: 'Paracetamol',
        dosage: '650mg',
        frequency: 'Thrice daily after meals',
        durationDays: 5,
        instructions: 'Take with plenty of water',
        startDate: new Date().toISOString().slice(0, 10),
        reminderTimes: ['08:00', '14:00', '20:00'],
      }),
    });
    if (!data.data.id) throw new Error('Medication failed to save');
  });

  // 8. Post-Visit AI Summary Generation & Approval Gate
  await test('Doctor Generates & Approves Patient-Friendly AI Summary', async () => {
    await api(`/ai/post-visit/${appointmentId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({ notes: 'Acute viral pharyngitis. Prescribed paracetamol.' }),
    });

    const approveRes = await api(`/ai/post-visit/${appointmentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (!approveRes.success) throw new Error('Approval failed');
  });

  // 9. Patient Accesses Approved Care Plan & Active Medications
  await test('Patient Accesses Approved Care Summary', async () => {
    const data = await api(`/ai/post-visit/${appointmentId}/patient`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (data.data === null) throw new Error('Patient summary not released');
  });

  await test('Patient Checks Active Medication List', async () => {
    const data = await api('/medications/my?activeOnly=true', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const meds = data.data;
    if (!meds || meds.length === 0) throw new Error('No active medications');
  });

  // 10. Doctor Leave Conflict Handling & Patient Notifications
  await test('Doctor Schedules Leave -> Auto-cancels & Notifies Patient', async () => {
    const leaveDate = getNextWeekday(40);
    const slotsRes = await api(`/availability/slots?doctorId=${doctorId}&date=${leaveDate}`);
    const availSlot = slotsRes.data.find((s: any) => s.available) || { startTime: '09:00', endTime: '09:30' };

    const holdData = await api('/availability/hold', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ doctorId, date: leaveDate, startTime: availSlot.startTime, endTime: availSlot.endTime }),
    });

    const conflictAppt = await api('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctorId,
        date: leaveDate,
        startTime: availSlot.startTime,
        endTime: availSlot.endTime,
        holdId: holdData.data.holdId,
        symptoms: 'Routine checkup prior to travel',
      }),
    });

    await api('/doctors/me/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({ leaveDate, reason: 'Specialist Medical Symposium' }),
    });

    const verifyData = await api(`/appointments/${conflictAppt.data.id}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (verifyData.data.status !== 'DOCTOR_LEAVE') {
      throw new Error(`Expected DOCTOR_LEAVE status, got ${verifyData.data.status}`);
    }
  });

  // 11. Admin Telemetry & Queue Stats
  await test('Admin Inspects Telemetry & BullMQ Notification Stats', async () => {
    const data = await api('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!data.data.totalAppointments) throw new Error('Dashboard stats missing');

    const notifStats = await api('/notifications/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (notifStats.data.total === undefined) throw new Error('Queue stats missing');
  });

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runVerification().catch(console.error);
