import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  Stethoscope,
  Sparkles,
  CalendarCheck,
  Pill,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Calendar,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent">
              HealthCare App
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
              Create Account
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> AI-Assisted Clinical Workflows
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Intelligent Healthcare Appointments & Medication Follow-ups
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate double bookings with atomic slot reservations. Empower doctors with AI pre-visit
            triage and provide patients with crystal-clear post-visit care plans.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              className="font-bold text-base px-8 py-3.5 shadow-lg shadow-blue-500/20"
              onClick={() => navigate('/register')}
            >
              Book Consultation Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="font-bold text-base px-8 py-3.5"
              onClick={() => navigate('/login')}
            >
              Sign In to Portal
            </Button>
          </div>

          {/* Quick Demo Credentials Banner */}
          <div className="mt-14 max-w-3xl mx-auto bg-white p-5 rounded-3xl border border-slate-200 shadow-md text-left">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quick Demo Credentials (Pre-seeded)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-purple-700 block mb-0.5">Admin</span>
                <p className="text-slate-600 font-mono text-[11px]">admin@healthcare.dev</p>
                <p className="text-slate-400 font-mono text-[10px]">Pass: Admin@123</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-blue-700 block mb-0.5">Doctor (Cardiology)</span>
                <p className="text-slate-600 font-mono text-[11px]">dr.smith@healthcare.dev</p>
                <p className="text-slate-400 font-mono text-[10px]">Pass: Doctor@123</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-teal-700 block mb-0.5">Patient</span>
                <p className="text-slate-600 font-mono text-[11px]">patient1@test.com</p>
                <p className="text-slate-400 font-mono text-[10px]">Pass: Patient@123</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Engineering Features */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Engineered for Clinical Precision & Reliability
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              High-concurrency architecture with database-level safety guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Double-Booking Prevention
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Database-level partial unique index constraints and 5-minute atomic slot hold timers
                guarantee zero double bookings under heavy concurrent loads.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl w-fit">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Dual-Layer AI Synthesizer
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pre-visit triage generates urgency scores & suggested questions for doctors. Post-visit
                synthesis translates clinical notes into patient-friendly care routines with approval gates.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Google Calendar & BullMQ Queues
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Asynchronous BullMQ worker queues handle automatic email confirmations, medication
                reminders, and Google Calendar sync with exponential retry backoff.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-200">HealthCare App System</span>
          </div>
          <p className="text-center sm:text-right text-[11px] text-slate-500">
            * Medical Disclaimer: AI summaries are decision-support aids only. Clinical authority rests exclusively with licensed physicians.
          </p>
        </div>
      </footer>
    </div>
  );
}
