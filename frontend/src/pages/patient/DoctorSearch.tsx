import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { DoctorCard } from '../../components/common/DoctorCard';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingPage } from '../../components/common/LoadingPage';
import { Search, Stethoscope } from 'lucide-react';

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<User[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const res = await api.get('/doctors/specializations');
        setSpecializations(res.data.data || []);
      } catch (err) {
        console.error('Failed to load specializations', err);
      }
    };
    fetchSpecializations();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (selectedSpecialization) params.append('specialization', selectedSpecialization);
        const res = await api.get(`/doctors?${params.toString()}`);
        setDoctors(res.data.data || []);
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(timer);
  }, [query, selectedSpecialization]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Find a Healthcare Specialist</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse our certified physicians and schedule your appointment with slot reservation.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by doctor name or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={[
              { label: 'All Specializations', value: '' },
              ...specializations.map((s) => ({ label: s, value: s })),
            ]}
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
          />
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <LoadingPage message="Finding available doctors..." />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No doctors match your criteria"
          description="Try clearing your filters or searching with different keywords."
          actionText="Reset Filters"
          onAction={() => {
            setQuery('');
            setSelectedSpecialization('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onViewProfile={(id) => navigate(`/patient/doctors/${id}`)}
              onBook={(id) => navigate(`/patient/book?doctorId=${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
