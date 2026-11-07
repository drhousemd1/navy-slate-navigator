import { useCoreTextClasses } from './useCoreTextClasses';

import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const StandardLoading: React.FC = () => {
  const text = useCoreTextClasses();
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <LoaderCircle className={`h-6 w-6 animate-spin ${text.primary}`} />
    </div>
  );
};

export const StandardError: React.FC = () => {
  const text = useCoreTextClasses();
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className={text.primary}>An error occurred. Please try again later.</p>
    </div>
  );
};

export const StandardEmpty: React.FC = () => {
  const text = useCoreTextClasses();
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className={text.primary}>You do not have any cards yet, create one to get started.</p>
    </div>
  );
};
