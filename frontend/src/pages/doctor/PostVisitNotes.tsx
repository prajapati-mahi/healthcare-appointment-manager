import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Appointment } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { LoadingPage } from '../../components/common/LoadingPage';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  FileText,
  Pill,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowLeft,
  Send,
  AlertCircle,
} from 'lucide-react';

interface MedInput {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export default function PostVisitNotes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medications, setMedications] = useState<MedInput[]>([]);

  // AI Summary State
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/appointments/${id}`);
        const appt: Appointment = res.data.data;
        setAppointment(appt);
        if (appt.postVisitNotes) setNotes(appt.postVisitNotes);
        if (appt.patientFriendlySummary) {
          try {
            const parsed = JSON.parse(appt.patientFriendlySummary);
            setGeneratedSummary(
              typeof parsed === 'string'
                ? parsed
                : JSON.stringify(parsed, null, 2)
            );
          } catch {
            setGeneratedSummary(appt.patientFriendlySummary);
          }
        }
        setIsApproved(appt.summaryApprovedByDoctor || false);
      } catch (err: any) {
        setError(err.message || 'Failed to load consultation');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  const addMedicationRow = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: 'Once daily', durationDays: 7, instructions: '' },
    ]);
  };

  const removeMedicationRow = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const updateMedication = (idx: number, field: keyof MedInput, val: any) => {
    const next = [...medications];
    next[idx] = { ...next[idx], [field]: val };
    setMedications(next);
  };

  // 1. Save Notes & Complete Visit
  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      alert('Please enter clinical notes before saving.');
      return;
    }
    setSavingNotes(true);
    try {
      // 1. Complete appointment
      await api.post(`/appointments/${id}/complete`, {
        postVisitNotes: notes,
        diagnosis,
        followUpDate: followUpDate || undefined,
      });

      // 2. Add medications if entered
      for (const med of medications) {
        if (med.name && appointment) {
          await api.post('/medications', {
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            durationDays: med.durationDays,
            instructions: med.instructions,
            startDate: new Date().toISOString().slice(0, 10),
            reminderTimes: ['09:00'],
          });
        }
      }

      alert('Clinical notes and prescriptions saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // 2. Generate Patient AI Summary
  const handleGenerateSummary = async () => {
    if (!notes.trim()) {
      alert('Please enter and save clinical notes first.');
      return;
    }
    setGeneratingAI(true);
    setAiError(null);

    try {
      // First ensure notes are saved
      await api.post(`/appointments/${id}/complete`, {
        postVisitNotes: notes,
        diagnosis,
        followUpDate: followUpDate || undefined,
      });

      const res = await api.post(`/ai/post-visit/${id}`, { notes });
      if (res.data.success && res.data.data) {
        setGeneratedSummary(JSON.stringify(res.data.data, null, 2));
      } else {
        setAiError(res.data.message || 'AI summary could not be generated.');
      }
    } catch (err: any) {
      setAiError(err.message || 'AI service unavailable.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // 3. Approve AI Summary
  const handleApproveSummary = async () => {
    setApproving(true);
    try {
      await api.post(`/ai/post-visit/${id}/approve`);
      setIsApproved(true);
      alert('Summary approved! It is now accessible in the patient portal.');
    } catch (err: any) {
      alert(err.message || 'Failed to approve summary');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading documentation workspace..." />;
  if (error || !appointment) {
    return (
      <ErrorState
        title="Error"
        message={error || 'Could not load appointment'}
        onRetry={() => navigate('/doctor/appointments')}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/doctor/appointments/${id}`)}
        className="text-xs text-slate-500 hover:text-slate-800 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Details
      </Button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              Post-Visit Clinical Documentation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Patient: <strong className="text-slate-700">{appointment.patient?.name}</strong> •{' '}
              {appointment.appointmentDate?.slice(0, 10)} at {appointment.startTime}
            </p>
          </div>
          {isApproved && (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Released to Patient
            </span>
          )}
        </div>
      </Card>

      {/* Clinical Notes Form */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileText className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Doctor Clinical Assessment</h2>
        </div>

        <Textarea
          label="Clinical Notes / Observations (Required)"
          placeholder="Document diagnosis, examination findings, and medical advice..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Diagnosis / Assessment"
            placeholder="e.g., Acute Bronchitis, Seasonal Rhinitis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />

          <Input
            label="Recommended Follow-up Date"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Prescription / Medications Form */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">Prescribed Medications</h2>
          </div>
          <Button variant="outline" size="sm" onClick={addMedicationRow} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No new medications added. Click "Add Medication" if prescribing drugs.
          </p>
        ) : (
          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-3">
                  <Input
                    label="Medication Name"
                    placeholder="e.g. Amoxicillin"
                    value={med.name}
                    onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Dosage"
                    placeholder="e.g. 500mg"
                    value={med.dosage}
                    onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Frequency"
                    placeholder="e.g. Twice daily"
                    value={med.frequency}
                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Duration (Days)"
                    type="number"
                    value={med.durationDays}
                    onChange={(e) => updateMedication(idx, 'durationDays', Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    className="p-2.5"
                    onClick={() => removeMedicationRow(idx)}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={handleSaveNotes} isLoading={savingNotes}>
            Save Clinical Notes
          </Button>
        </div>
      </Card>

      {/* AI Post-Visit Patient Summary Generation & Approval Gate */}
      <Card className="p-6 bg-gradient-to-br from-purple-50/40 via-blue-50/40 to-teal-50/40 border-indigo-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Patient-Friendly AI Care Summary
              </h2>
              <p className="text-[11px] text-indigo-700">
                Converts complex medical jargon into clear instructions for the patient
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateSummary}
            isLoading={generatingAI}
            className="shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {generatedSummary ? 'Regenerate Summary' : 'Generate Patient Summary'}
          </Button>
        </div>

        {aiError && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {aiError}
          </div>
        )}

        {generatedSummary ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Summary Preview (Doctor Editable)
            </label>
            <Textarea
              value={generatedSummary}
              onChange={(e) => setGeneratedSummary(e.target.value)}
              rows={8}
              className="font-mono text-xs bg-white/90"
            />
            <p className="text-[11px] text-slate-500 italic">
              Review and adjust the generated advice above before releasing it to the patient.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleApproveSummary}
                isLoading={approving}
                disabled={isApproved}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {isApproved ? 'Approved & Visible to Patient' : 'Approve & Release to Patient'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-indigo-100">
            Click "Generate Patient Summary" above to translate your clinical notes into easy-to-read
            patient instructions.
          </div>
        )}
      </Card>
    </div>
  );
}
