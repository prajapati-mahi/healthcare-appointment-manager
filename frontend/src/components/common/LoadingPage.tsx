import React from 'react';
import { Spinner } from '../ui/Spinner';

export const LoadingPage: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner size="lg" className="text-blue-600" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};
