import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Stethoscope, Award, IndianRupee } from 'lucide-react';
import type { User } from '../../types';

interface DoctorCardProps {
  doctor: User;
  onBook?: (doctorId: string) => void;
  onViewProfile?: (doctorId: string) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onBook,
  onViewProfile,
}) => {
  const profile = doctor.doctorProfile;

  return (
    <Card className="flex flex-col justify-between p-5 hover:shadow-md transition-shadow border-slate-200">
      <div>
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            {doctor.name.replace('Dr. ', '').charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base leading-snug">{doctor.name}</h3>
            <p className="text-xs font-semibold text-teal-600 flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5" />
              {profile?.specialization || 'General Physician'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 mb-4 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span>{profile?.qualifications || 'MBBS'}</span>
          </p>
          {profile?.experienceYears ? (
            <p className="text-slate-500 pl-5">
              {profile.experienceYears}+ years experience
            </p>
          ) : null}
          {profile?.consultationFee ? (
            <p className="flex items-center gap-1 font-semibold text-slate-700 pt-1">
              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              <span>₹{profile.consultationFee} consultation fee</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        {onViewProfile && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewProfile(doctor.id)}
          >
            View Info
          </Button>
        )}
        {onBook && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onBook(doctor.id)}
          >
            Book Visit
          </Button>
        )}
      </div>
    </Card>
  );
};
