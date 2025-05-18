
import React from 'react';
import { Inbox } from 'lucide-react'; // Example icon, can be customized via props

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode; // For a button or link
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: IconComponent = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-lg bg-slate-800 border border-slate-700 my-4">
      <IconComponent className="w-16 h-16 text-slate-500 mb-4" strokeWidth={1.5} />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-slate-400 mb-6 max-w-md">{description}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
