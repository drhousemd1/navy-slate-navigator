
import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const StandardLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <LoaderCircle className="h-6 w-6 animate-spin text-white" />
    </div>
  );
};

export const StandardError: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className="text-white">An error occurred. Please try again later.</p>
    </div>
  );
};

export const StandardEmpty: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className="text-white">You do not have any cards yet, create one to get started.</p>
    </div>
  );
};
