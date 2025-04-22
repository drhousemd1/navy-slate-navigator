
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PunishmentFormValues } from './PunishmentFormProvider';

interface PunishmentFormLayoutProps {
  children: React.ReactNode;
  onSubmit: () => void;
}

const PunishmentFormLayout: React.FC<PunishmentFormLayoutProps> = ({
  children,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {children}
    </form>
  );
};

export default PunishmentFormLayout;
