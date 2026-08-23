import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = async (pw: string) => bcrypt.hash(pw, 10);

  // ─── Admin ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthcare.dev' },
    update: {},
    create: {
      email: 'admin@healthcare.dev',
      passwordHash: await passwordHash('Admin@123'),
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Doctors ──────────────────────────────────────────────────────────────
  const doctorSeeds = [
    {
      email: 'dr.smith@healthcare.dev',
      password: 'Doctor@123',
      name: 'Dr. John Smith',
      specialization: 'General Medicine',
      qualifications: 'MBBS, MD (Internal Medicine)',
      bio: 'Experienced general physician with 12 years of practice. Specializes in preventive care and chronic disease management.',
      experience: 12,
      fee: 500,
    },
    {
      email: 'dr.sarah@healthcare.dev',
      password: 'Doctor@123',
      name: 'Dr. Sarah Johnson',
      specialization: 'Cardiology',
      qualifications: 'MBBS, MD (Cardiology), DM',
      bio: 'Cardiologist specializing in interventional procedures and heart failure management.',
      experience: 15,
      fee: 800,
    },
    {
      email: 'dr.patel@healthcare.dev',
      password: 'Doctor@123',
      name: 'Dr. Raj Patel',
      specialization: 'Pediatrics',
      qualifications: 'MBBS, MD (Pediatrics)',
      bio: 'Dedicated pediatrician providing comprehensive care for children from newborns to adolescents.',
      experience: 8,
      fee: 400,
    },
  ];

  const doctors: { user: any; profile: any }[] = [];
  for (const d of doctorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash: await passwordHash(d.password),
        name: d.name,
        role: 'DOCTOR',
        isActive: true,
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialization: d.specialization,
        qualifications: d.qualifications,
        bio: d.bio,
        experienceYears: d.experience,
        slotDuration: 30,
        consultationFee: d.fee,
        isActive: true,
      },
    });

    // Working hours: Mon-Fri (1-5), 09:00-17:00
    for (let day = 1; day <= 5; day++) {
      await prisma.workingHours.upsert({
        where: { doctorProfileId_dayOfWeek: { doctorProfileId: profile.id, dayOfWeek: day } },
        update: {},
        create: {
          doctorProfileId: profile.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      });
    }

    // Saturday (6): 09:00-13:00 for first doctor
    if (d.email === 'dr.smith@healthcare.dev') {
      await prisma.workingHours.upsert({
        where: { doctorProfileId_dayOfWeek: { doctorProfileId: profile.id, dayOfWeek: 6 } },
        update: {},
        create: { doctorProfileId: profile.id, dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isActive: true },
      });
    }

    doctors.push({ user, profile });
    console.log(`✅ Doctor: ${user.email} (${d.specialization})`);
  }

  // ─── Patients ─────────────────────────────────────────────────────────────
  const patientSeeds = [
    { email: 'patient1@test.com', password: 'Patient@123', name: 'Alice Thompson', dob: '1990-05-15', gender: 'Female', phone: '+91-9876543210' },
    { email: 'patient2@test.com', password: 'Patient@123', name: 'Bob Martinez',   dob: '1985-11-22', gender: 'Male',   phone: '+91-9876543211' },
    { email: 'patient3@test.com', password: 'Patient@123', name: 'Carol Nguyen',   dob: '1995-03-08', gender: 'Female', phone: '+91-9876543212' },
  ];

  const patients: any[] = [];
  for (const p of patientSeeds) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: await passwordHash(p.password),
        name: p.name,
        role: 'PATIENT',
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        phone: p.phone,
        isActive: true,
      },
    });
    patients.push(user);
    console.log(`✅ Patient: ${user.email}`);
  }

  // ─── Sample Appointments ──────────────────────────────────────────────────
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Future appointment
  const futureAppt = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].user.id,
      appointmentDate: nextWeek,
      startTime: '10:00',
      endTime: '10:30',
      status: 'BOOKED',
      symptoms: 'Persistent headache for 3 days, mild fever, fatigue',
      symptomDuration: '3 days',
      symptomSeverity: 'Moderate',
      preVisitSummaryStatus: 'PENDING',
      calendarSyncStatus: 'PENDING',
    },
  });
  console.log(`✅ Sample future appointment: ${futureAppt.id}`);

  // Past completed appointment with prescription
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 7);

  const pastAppt = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].user.id,
      appointmentDate: pastDate,
      startTime: '09:00',
      endTime: '09:30',
      status: 'COMPLETED',
      symptoms: 'Seasonal allergies, runny nose, itchy eyes',
      symptomDuration: '1 week',
      symptomSeverity: 'Mild',
      preVisitSummaryStatus: 'GENERATED',
      urgencyLevel: 'LOW',
      chiefComplaint: 'Seasonal allergic rhinitis with conjunctivitis symptoms',
      suggestedQuestions: [
        'Have you been exposed to any new allergens recently?',
        'Are you currently taking any antihistamines?',
        'Do you have a history of asthma or eczema?',
      ],
      postVisitNotes: 'Patient presents with typical seasonal allergy symptoms. Prescribed antihistamines and nasal spray. Advised to avoid outdoor activities during high pollen count.',
      patientFriendlySummary: JSON.stringify({
        visitSummary: 'Your visit today was for seasonal allergy symptoms. The doctor has diagnosed you with seasonal allergic rhinitis. Your symptoms should improve with the prescribed medications.',
        keyInstructions: [
          'Take Cetirizine 10mg once daily at night',
          'Use Fluticasone nasal spray as prescribed',
          'Avoid outdoor activities during peak pollen hours (5-10 AM)',
        ],
        medicationSchedule: [
          { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily at night', instructions: 'Take with water' },
          { name: 'Fluticasone Nasal Spray', dosage: '2 puffs each nostril', frequency: 'Once daily morning', instructions: 'Shake well before use' },
        ],
        followUpSteps: ['Return in 2 weeks if symptoms persist', 'Consider allergy testing if recurrent'],
        warnings: ['Avoid rubbing your eyes', 'Seek immediate care if you develop difficulty breathing'],
      }),
      summaryApprovedByDoctor: true,
      calendarSyncStatus: 'SYNCED',
    },
  });

  await prisma.prescription.create({
    data: {
      appointmentId: pastAppt.id,
      diagnosis: 'Seasonal Allergic Rhinitis',
      notes: 'Cetirizine 10mg once daily + Fluticasone nasal spray. Follow up in 2 weeks.',
      followUpDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.medication.create({
    data: {
      appointmentId: pastAppt.id,
      patientId: patients[0].id,
      name: 'Cetirizine',
      dosage: '10mg',
      frequency: 'Once daily',
      durationDays: 14,
      instructions: 'Take at night with water. May cause drowsiness.',
      startDate: pastDate,
      endDate: new Date(pastDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      reminderTimes: ['21:00'],
      isActive: true,
    },
  });

  console.log(`✅ Sample completed appointment with prescription: ${pastAppt.id}`);

  // Second patient appointment
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  await prisma.appointment.create({
    data: {
      patientId: patients[1].id,
      doctorId: doctors[1].user.id, // Cardiologist
      appointmentDate: tomorrowDate,
      startTime: '14:00',
      endTime: '14:30',
      status: 'CONFIRMED',
      symptoms: 'Chest discomfort, occasional palpitations for the past week',
      symptomDuration: '1 week',
      symptomSeverity: 'Moderate',
      preVisitSummaryStatus: 'PENDING',
      calendarSyncStatus: 'PENDING',
    },
  });
  console.log(`✅ Sample cardiology appointment for patient 2`);

  console.log('\n🎉 Seeding completed!\n');
  console.log('─────────────── Demo Credentials ───────────────');
  console.log('Admin:   admin@healthcare.dev     / Admin@123');
  console.log('Doctor:  dr.smith@healthcare.dev  / Doctor@123');
  console.log('Doctor:  dr.sarah@healthcare.dev  / Doctor@123');
  console.log('Doctor:  dr.patel@healthcare.dev  / Doctor@123');
  console.log('Patient: patient1@test.com        / Patient@123');
  console.log('Patient: patient2@test.com        / Patient@123');
  console.log('Patient: patient3@test.com        / Patient@123');
  console.log('────────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
