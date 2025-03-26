
import React from 'react';
import { Badge } from '../ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Settings } from 'lucide-react';

const PunishmentsHeader: React.FC = () => {
  const { totalPoints } = useRewards();

  return (
    <header className="bg-dark-navy py-4 px-4 flex justify-between items-center">
      <h1 className="text-2xl font-semibold text-white">Punishments</h1>
      <div className="flex items-center gap-4">
        <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-5 py-2 rounded-full text-sm">
          {totalPoints} Points
        </Badge>
        <Settings className="w-6 h-6 text-white cursor-pointer hover:text-cyan-500 transition-colors" />
      </div>
    </header>
  );
};

export default PunishmentsHeader;
