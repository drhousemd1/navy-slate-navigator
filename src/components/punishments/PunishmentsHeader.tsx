
import React from 'react';
import { usePunishments } from '@/contexts/punishments/types';
import { Skull } from 'lucide-react';

const PunishmentsHeader = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
          <Skull className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Punishments</h1>
          <p className="text-gray-400">Manage your punishment consequences</p>
        </div>
      </div>
    </div>
  );
};

export default PunishmentsHeader;
