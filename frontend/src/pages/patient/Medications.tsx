import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Medication } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Pill, Clock, Calendar, CheckCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/medications/my?activeOnly=${activeOnly}`);
      setMedications(res.data.data || []);
    } catch (err) {
      console.error('Failed to load medications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [activeOnly]);

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Mark this medication as stopped / completed?')) return;
    try {
      await api.delete(`/medications/${id}`);
      fetchMedications();
    } catch (err: any) {
      alert(err.message || 'Failed to update medication');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">My Prescribed Medications</h1>
          <p className="text-sm text-slate-500 mt-1">
            View active courses, dosing instructions, and background reminder alerts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(true)}
          >
            Active Only
          </Button>
          <Button
            variant={!activeOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(false)}
          >
            All History
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingPage message="Loading medication schedule..." />
      ) : medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No active medications"
          description="You do not have any active medication schedules prescribed at this time."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <Card key={med.id} className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{med.name}</h3>
                      <p className="text-xs text-slate-500">{med.dosage}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      med.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {med.isActive ? 'Active' : 'Completed'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Frequency: <strong className="text-slate-700">{med.frequency}</strong></span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Duration: {med.durationDays} days (until{' '}
                      {format(new Date(med.endDate), 'MMM d, yyyy')})
                    </span>
                  </p>
                  {med.instructions && (
                    <p className="text-slate-500 pt-1 border-t border-slate-200">
                      <strong>Notes: </strong>{med.instructions}
                    </p>
                  )}
                </div>
              </div>

              {med.isActive && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDeactivate(med.id)}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" /> Stop Medication
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
